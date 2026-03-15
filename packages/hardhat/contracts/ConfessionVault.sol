// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ConfessionVault V2
/// @author Who Said That
/// @notice Anonymous encrypted confessions with FHE-powered guessing, community reveal/block
///         pools, AI hints, and proper fund distribution. All audit findings from V1 addressed.
/// @dev Uses Fhenix CoFHE for encrypted identity comparison. Pools track individual
///      contributions for refund paths. Treasury is isolated from pool balances.
contract ConfessionVault is ReentrancyGuard {
    // ─── Types ───────────────────────────────────────────────────────────

    /// @notice Confession data — struct fields ordered for optimal storage packing
    struct Confession {
        euint32 encSenderId;       // FHE-encrypted sender platform ID         (slot 0: 32 bytes)
        address sender;            // wallet that sent (for payment tracking)   (slot 1: 20 bytes)
        uint8 platform;            // 0=farcaster, 1=google, 2=wallet          (slot 1: 1 byte)
        uint8 guessesUsed;         // 0-3                                      (slot 1: 1 byte)
        bool revealed;             // sender identity is known                 (slot 1: 1 byte)
        bool isPublic;             // private inbox vs public feed             (slot 1: 1 byte)
        bool settled;              // pools have been distributed/refunded     (slot 1: 1 byte)
        uint256 recipientId;       // plaintext — needed for inbox queries     (slot 2)
        bytes32 messageRef;        // pointer to off-chain message in Supabase (slot 3)
        uint256 timestamp;         //                                          (slot 4)
        uint256 revealPrice;       // ETH threshold for community unmask       (slot 5)
        uint256 revealPool;        // ETH contributed toward reveal            (slot 6)
        uint256 blockPool;         // ETH contributed to block reveal          (slot 7)
    }

    /// @notice Tracks an async FHE guess decryption request
    struct GuessRequest {
        ebool result;              // encrypted result of FHE.eq
        address guesser;           // who made the guess
        uint256 submittedAt;       // timestamp of submission (for timeout)
        bool pending;              // waiting for async decrypt
        bool resolved;             // decrypt result has been read
    }

    /// @notice Individual contribution record for pool refunds
    struct Contribution {
        address contributor;
        uint256 amount;
    }

    // ─── Constants ──────────────────────────────────────────────────────

    /// @notice Duration after which unresolved pools can be refunded (30 days)
    uint256 public constant POOL_EXPIRY = 30 days;

    /// @notice Duration after which a pending guess can be cancelled (5 minutes)
    uint256 public constant GUESS_TIMEOUT = 5 minutes;

    /// @notice Maximum number of platforms supported
    uint8 public constant MAX_PLATFORM = 2;

    /// @notice Maximum guesses per confession
    uint8 public constant MAX_GUESSES = 3;

    /// @notice Maximum block pool multiplier relative to reveal price
    uint256 public constant BLOCK_CAP_MULTIPLIER = 10;

    // ─── State ───────────────────────────────────────────────────────────

    /// @notice Total confessions created
    uint256 public confessionCount;

    /// @notice Current treasury address
    address public treasury;

    /// @notice Proposed new treasury address (two-step transfer)
    address public pendingTreasury;

    /// @notice Registrar address — only this address can register users
    address public registrar;

    /// @notice Accumulated treasury balance (isolated from pool funds)
    uint256 public treasuryBalance;

    /// @notice Confession storage
    mapping(uint256 => Confession) internal confessions;

    /// @notice Recipient inbox: recipientId => confessionIds
    mapping(uint256 => uint256[]) internal inbox;

    /// @notice Latest guess per confession
    mapping(uint256 => GuessRequest) internal latestGuess;

    /// @notice Platform ID => wallet (first-come-first-served, immutable once set)
    mapping(uint256 => address) public platformWallet;

    /// @notice Hint pricing tiers (in wei)
    uint256[5] public hintPrices = [
        0.0001 ether,   // Hint 1 — basic
        0.0005 ether,   // Hint 2 — moderate
        0.001 ether,    // Hint 3 — detailed
        0.002 ether,    // Hint 4 — very specific
        0.005 ether     // Hint 5 — near-reveal
    ];

    /// @notice Hint level purchased per confession (0-5)
    mapping(uint256 => uint8) public hintLevels;

    /// @notice Reveal pool individual contributions for refund tracking
    mapping(uint256 => Contribution[]) internal revealContributions;

    /// @notice Block pool individual contributions for refund tracking
    mapping(uint256 => Contribution[]) internal blockContributions;

    /// @notice Public confession IDs for enumeration
    uint256[] public publicConfessionIds;

    // ─── Events ──────────────────────────────────────────────────────────

    /// @notice Emitted when a private confession is sent
    event ConfessionSent(
        uint256 indexed confessionId,
        uint256 indexed recipientId,
        uint8 platform,
        uint256 timestamp
    );

    /// @notice Emitted when a public confession is posted
    event PublicConfessionPosted(
        uint256 indexed confessionId,
        uint8 platform,
        uint256 revealPrice,
        uint256 timestamp
    );

    /// @notice Emitted when a guess is submitted and FHE decrypt initiated
    event GuessPending(
        uint256 indexed confessionId,
        address indexed guesser,
        uint8 guessNumber
    );

    /// @notice Emitted when a guess decrypt result is read
    event GuessResolved(
        uint256 indexed confessionId,
        address indexed guesser,
        bool correct
    );

    /// @notice Emitted when a stuck guess is cancelled after timeout
    event GuessCancelled(
        uint256 indexed confessionId,
        address indexed guesser
    );

    /// @notice Emitted when a hint is purchased
    event HintPurchased(
        uint256 indexed confessionId,
        address indexed buyer,
        uint8 hintLevel,
        uint256 price
    );

    /// @notice Emitted when ETH is contributed toward reveal
    event RevealContribution(
        uint256 indexed confessionId,
        address indexed contributor,
        uint256 amount,
        uint256 totalPool
    );

    /// @notice Emitted when ETH is contributed to block reveal
    event RevealBlocked(
        uint256 indexed confessionId,
        uint256 newBlockPool
    );

    /// @notice Emitted when a confession identity is revealed
    event IdentityRevealed(uint256 indexed confessionId);

    /// @notice Emitted when a platform ID is registered to a wallet
    event UserRegistered(uint256 indexed platformId, address wallet);

    /// @notice Emitted when a new treasury address is proposed
    event TreasuryProposed(address indexed current, address indexed proposed);

    /// @notice Emitted when a proposed treasury accepts ownership
    event TreasuryAccepted(address indexed oldTreasury, address indexed newTreasury);

    /// @notice Emitted when a refund is issued from a pool
    event RefundIssued(
        uint256 indexed confessionId,
        address indexed recipient,
        uint256 amount,
        bool isRevealPool
    );

    /// @notice Emitted when pool funds are settled (reveal succeeded or expired)
    event PoolSettled(
        uint256 indexed confessionId,
        bool revealed,
        uint256 revealPoolTotal,
        uint256 blockPoolTotal
    );

    /// @notice Emitted when treasury balance is withdrawn
    event TreasuryWithdrawn(address indexed to, uint256 amount);

    // ─── Errors ──────────────────────────────────────────────────────────

    error InvalidRecipient();
    error InvalidPlatform();
    error ConfessionNotFound();
    error AlreadyRevealed();
    error NoGuessesRemaining();
    error CannotGuessPublic();
    error OnlyRecipient();
    error GuessPendingResolve();
    error NoGuessPending();
    error AlreadyResolved();
    error DecryptNotReady();
    error AllHintsPurchased();
    error ExactPaymentRequired(uint256 required, uint256 sent);
    error NotPublicConfession();
    error MustContribute();
    error OnlySender();
    error BlockCapExceeded();
    error NotRevealed();
    error OnlyTreasury();
    error OnlyRegistrar();
    error PlatformAlreadyRegistered();
    error ZeroAddress();
    error NoPendingTreasury();
    error OnlyPendingTreasury();
    error OnlyGuesserOrRecipient();
    error GuessNotTimedOut();
    error AlreadySettled();
    error PoolNotExpired();
    error NothingToWithdraw();
    error TransferFailed();
    error MinRevealPrice();

    // ─── Modifiers ──────────────────────────────────────────────────────

    /// @dev Restricts to the current treasury address
    modifier onlyTreasury() {
        if (msg.sender != treasury) revert OnlyTreasury();
        _;
    }

    /// @dev Restricts to the registrar address
    modifier onlyRegistrar() {
        if (msg.sender != registrar) revert OnlyRegistrar();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────

    /// @notice Initializes the vault with treasury and registrar addresses
    /// @param _treasury Address to receive protocol fees
    /// @param _registrar Address authorized to register platform identities
    constructor(address _treasury, address _registrar) {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_registrar == address(0)) revert ZeroAddress();
        treasury = _treasury;
        registrar = _registrar;
    }

    // ─── Core Functions ──────────────────────────────────────────────────

    /// @notice Returns the contract version
    /// @return Version string
    function version() external pure returns (string memory) {
        return "2.0.0";
    }

    /// @notice Register a platform ID to a wallet address
    /// @dev Only callable by the registrar. First-come-first-served: once a platformId
    ///      is registered, it cannot be overwritten. The backend validates the user's
    ///      identity off-chain, then calls this through the registrar wallet.
    /// @param _platformId The platform-specific user ID
    /// @param _wallet The wallet address to associate
    function registerUser(uint256 _platformId, address _wallet) external onlyRegistrar {
        if (_wallet == address(0)) revert ZeroAddress();
        if (platformWallet[_platformId] != address(0)) revert PlatformAlreadyRegistered();
        platformWallet[_platformId] = _wallet;
        emit UserRegistered(_platformId, _wallet);
    }

    /// @notice Send an anonymous confession with FHE-encrypted sender identity
    /// @param _encSenderId FHE-encrypted sender platform ID
    /// @param _recipientId Plaintext recipient platform ID (for inbox routing)
    /// @param _messageRef Off-chain message reference (Supabase pointer)
    /// @param _platform Platform enum: 0=farcaster, 1=google, 2=wallet
    function sendConfession(
        InEuint32 memory _encSenderId,
        uint256 _recipientId,
        bytes32 _messageRef,
        uint8 _platform
    ) external {
        if (_recipientId == 0) revert InvalidRecipient();
        if (_platform > MAX_PLATFORM) revert InvalidPlatform();

        confessionCount++;

        euint32 senderId = FHE.asEuint32(_encSenderId);

        // Grant permissions
        FHE.allowThis(senderId);     // contract can compute FHE.eq for guessing
        FHE.allowSender(senderId);   // sender can decrypt own identity if needed

        confessions[confessionCount] = Confession({
            encSenderId: senderId,
            sender: msg.sender,
            platform: _platform,
            guessesUsed: 0,
            revealed: false,
            isPublic: false,
            settled: false,
            recipientId: _recipientId,
            messageRef: _messageRef,
            timestamp: block.timestamp,
            revealPrice: 0,
            revealPool: 0,
            blockPool: 0
        });

        inbox[_recipientId].push(confessionCount);

        emit ConfessionSent(confessionCount, _recipientId, _platform, block.timestamp);
    }

    /// @notice Post a public anonymous confession (visible to everyone)
    /// @param _encSenderId FHE-encrypted sender platform ID
    /// @param _messageRef Off-chain message reference
    /// @param _platform Platform enum: 0=farcaster, 1=google, 2=wallet
    /// @param _revealPrice ETH threshold for community unmask (min 0.01 ETH)
    function postPublic(
        InEuint32 memory _encSenderId,
        bytes32 _messageRef,
        uint8 _platform,
        uint256 _revealPrice
    ) external {
        if (_revealPrice < 0.01 ether) revert MinRevealPrice();
        if (_platform > MAX_PLATFORM) revert InvalidPlatform();

        confessionCount++;

        euint32 senderId = FHE.asEuint32(_encSenderId);
        FHE.allowThis(senderId);
        FHE.allowSender(senderId);

        confessions[confessionCount] = Confession({
            encSenderId: senderId,
            sender: msg.sender,
            platform: _platform,
            guessesUsed: 0,
            revealed: false,
            isPublic: true,
            settled: false,
            recipientId: 0,            // no specific recipient
            messageRef: _messageRef,
            timestamp: block.timestamp,
            revealPrice: _revealPrice,
            revealPool: 0,
            blockPool: 0
        });

        publicConfessionIds.push(confessionCount);

        emit PublicConfessionPosted(confessionCount, _platform, _revealPrice, block.timestamp);
    }

    // ─── Guessing Game ───────────────────────────────────────────────────

    /// @notice Submit a guess for who sent a confession (step 1 of 2)
    /// @dev Initiates async FHE.eq comparison + decrypt. Call resolveGuess() after ~10s.
    ///      Only the recipient (or anyone if recipient wallet not registered) can guess.
    /// @param _confessionId ID of the confession to guess on
    /// @param _encGuess FHE-encrypted guess of the sender's platform ID
    function submitGuess(
        uint256 _confessionId,
        InEuint32 memory _encGuess
    ) external {
        Confession storage c = confessions[_confessionId];
        if (c.timestamp == 0) revert ConfessionNotFound();
        if (c.revealed) revert AlreadyRevealed();
        if (c.guessesUsed >= MAX_GUESSES) revert NoGuessesRemaining();
        if (c.isPublic) revert CannotGuessPublic();

        // Only the recipient can guess
        address recipientWallet = platformWallet[c.recipientId];
        if (recipientWallet != address(0) && recipientWallet != msg.sender) {
            revert OnlyRecipient();
        }

        // No pending unresolved guess
        if (latestGuess[_confessionId].pending) revert GuessPendingResolve();

        // Compute encrypted equality check
        euint32 guess = FHE.asEuint32(_encGuess);
        ebool isCorrect = FHE.eq(c.encSenderId, guess);

        // FIX #8: Grant contract permission to decrypt the result
        FHE.allowThis(isCorrect);

        // Initiate async decryption via threshold network
        FHE.decrypt(isCorrect);

        // Store the guess request
        latestGuess[_confessionId] = GuessRequest({
            result: isCorrect,
            guesser: msg.sender,
            submittedAt: block.timestamp,
            pending: true,
            resolved: false
        });

        c.guessesUsed++;

        emit GuessPending(_confessionId, msg.sender, c.guessesUsed);
    }

    /// @notice Resolve a pending guess (step 2 of 2)
    /// @dev Call after threshold network has processed the decryption (~5-30s).
    ///      Only the original guesser or the confession recipient can resolve.
    /// @param _confessionId ID of the confession with a pending guess
    function resolveGuess(uint256 _confessionId) external {
        GuessRequest storage g = latestGuess[_confessionId];
        if (!g.pending) revert NoGuessPending();
        if (g.resolved) revert AlreadyResolved();

        // FIX #7: Only the guesser or the recipient can resolve
        Confession storage c = confessions[_confessionId];
        address recipientWallet = platformWallet[c.recipientId];
        if (msg.sender != g.guesser && msg.sender != recipientWallet) {
            revert OnlyGuesserOrRecipient();
        }

        // Try to read the decrypted result
        (bool correct, bool isReady) = FHE.getDecryptResultSafe(g.result);
        if (!isReady) revert DecryptNotReady();

        g.pending = false;
        g.resolved = true;

        if (correct) {
            c.revealed = true;
            emit IdentityRevealed(_confessionId);
        }

        emit GuessResolved(_confessionId, g.guesser, correct);
    }

    /// @notice Cancel a pending guess that has timed out
    /// @dev Clears the pending guess without consuming a guess slot (restores guessesUsed).
    ///      Callable after GUESS_TIMEOUT (5 minutes) by anyone.
    /// @param _confessionId ID of the confession with a stuck guess
    function cancelPendingGuess(uint256 _confessionId) external {
        GuessRequest storage g = latestGuess[_confessionId];
        if (!g.pending) revert NoGuessPending();
        if (block.timestamp < g.submittedAt + GUESS_TIMEOUT) revert GuessNotTimedOut();

        Confession storage c = confessions[_confessionId];

        // Restore the guess slot
        if (c.guessesUsed > 0) {
            c.guessesUsed--;
        }

        g.pending = false;
        g.resolved = true;

        emit GuessCancelled(_confessionId, g.guesser);
    }

    // ─── Hints ───────────────────────────────────────────────────────────

    /// @notice Buy the next AI hint for a confession
    /// @dev Requires exact payment matching the tier price. Overpayment reverts.
    /// @param _confessionId ID of the confession to buy a hint for
    function buyHint(uint256 _confessionId) external payable nonReentrant {
        Confession storage c = confessions[_confessionId];
        if (c.timestamp == 0) revert ConfessionNotFound();
        if (c.revealed) revert AlreadyRevealed();

        uint8 currentLevel = hintLevels[_confessionId];
        if (currentLevel >= 5) revert AllHintsPurchased();

        uint256 price = hintPrices[currentLevel];

        // FIX #5: Exact payment required — no overpayment
        if (msg.value != price) revert ExactPaymentRequired(price, msg.value);

        hintLevels[_confessionId] = currentLevel + 1;

        // Add to treasury balance (not sent immediately — isolated from pools)
        treasuryBalance += msg.value;

        emit HintPurchased(_confessionId, msg.sender, currentLevel + 1, msg.value);
    }

    // ─── Community Unmask (Public Confessions Only) ──────────────────────

    /// @notice Contribute ETH toward unmasking a public confession
    /// @dev Tracks individual contributions for refund capability.
    ///      When reveal threshold is met (pool >= price AND pool > blockPool),
    ///      the reveal pool goes to treasury and block pool is refunded to sender.
    /// @param _confessionId ID of the public confession
    function contributeToReveal(uint256 _confessionId) external payable nonReentrant {
        Confession storage c = confessions[_confessionId];
        if (!c.isPublic) revert NotPublicConfession();
        if (c.revealed) revert AlreadyRevealed();
        if (c.settled) revert AlreadySettled();
        if (msg.value == 0) revert MustContribute();

        c.revealPool += msg.value;

        // Track individual contribution for potential refund
        revealContributions[_confessionId].push(Contribution({
            contributor: msg.sender,
            amount: msg.value
        }));

        emit RevealContribution(_confessionId, msg.sender, msg.value, c.revealPool);

        // Check if reveal threshold met (pool must exceed both price and block pool)
        if (c.revealPool >= c.revealPrice && c.revealPool > c.blockPool) {
            c.revealed = true;
            c.settled = true;

            // Initiate sender identity decryption
            FHE.decrypt(c.encSenderId);

            // Reveal pool goes to treasury
            treasuryBalance += c.revealPool;

            // Block pool refunded to the confession sender
            uint256 blockRefund = c.blockPool;
            if (blockRefund > 0) {
                // The sender deposited all block pool funds, so refund to sender
                _safeTransfer(c.sender, blockRefund);
                emit RefundIssued(_confessionId, c.sender, blockRefund, false);
            }

            emit IdentityRevealed(_confessionId);
            emit PoolSettled(_confessionId, true, c.revealPool, c.blockPool);
        }
    }

    /// @notice Sender pays to raise the reveal barrier
    /// @dev Only the original sender wallet can call this. Capped at 10x the reveal price.
    /// @param _confessionId ID of the public confession
    function blockReveal(uint256 _confessionId) external payable nonReentrant {
        Confession storage c = confessions[_confessionId];
        if (!c.isPublic) revert NotPublicConfession();
        if (c.revealed) revert AlreadyRevealed();
        if (c.settled) revert AlreadySettled();
        if (c.sender != msg.sender) revert OnlySender();
        if (msg.value == 0) revert MustContribute();

        // Cap: sender can't block more than 10x the original reveal price
        if (c.blockPool + msg.value > c.revealPrice * BLOCK_CAP_MULTIPLIER) {
            revert BlockCapExceeded();
        }

        c.blockPool += msg.value;

        // Track individual block contribution for refund
        blockContributions[_confessionId].push(Contribution({
            contributor: msg.sender,
            amount: msg.value
        }));

        emit RevealBlocked(_confessionId, c.blockPool);
    }

    /// @notice Refund expired pools when reveal was NOT reached after 30 days
    /// @dev Anyone can trigger this after POOL_EXPIRY. Reveal contributors are refunded
    ///      their individual contributions. Block pool contributors are also refunded.
    /// @param _confessionId ID of the public confession with expired pools
    function refundExpiredPool(uint256 _confessionId) external nonReentrant {
        Confession storage c = confessions[_confessionId];
        if (!c.isPublic) revert NotPublicConfession();
        if (c.revealed) revert AlreadyRevealed();
        if (c.settled) revert AlreadySettled();
        if (block.timestamp < c.timestamp + POOL_EXPIRY) revert PoolNotExpired();

        c.settled = true;

        // Refund all reveal pool contributors
        Contribution[] storage rContribs = revealContributions[_confessionId];
        for (uint256 i = 0; i < rContribs.length; i++) {
            if (rContribs[i].amount > 0) {
                _safeTransfer(rContribs[i].contributor, rContribs[i].amount);
                emit RefundIssued(_confessionId, rContribs[i].contributor, rContribs[i].amount, true);
            }
        }

        // Refund all block pool contributors
        Contribution[] storage bContribs = blockContributions[_confessionId];
        for (uint256 i = 0; i < bContribs.length; i++) {
            if (bContribs[i].amount > 0) {
                _safeTransfer(bContribs[i].contributor, bContribs[i].amount);
                emit RefundIssued(_confessionId, bContribs[i].contributor, bContribs[i].amount, false);
            }
        }

        emit PoolSettled(_confessionId, false, c.revealPool, c.blockPool);
    }

    /// @notice Read the decrypted sender ID after a public reveal
    /// @param _confessionId ID of the revealed public confession
    /// @return The decrypted sender platform ID
    function getRevealedSender(uint256 _confessionId) external view returns (uint256) {
        Confession storage c = confessions[_confessionId];
        if (!c.revealed) revert NotRevealed();
        if (!c.isPublic) revert NotPublicConfession();

        (uint256 senderId, bool ready) = FHE.getDecryptResultSafe(c.encSenderId);
        if (!ready) revert DecryptNotReady();

        return senderId;
    }

    // ─── View Functions ──────────────────────────────────────────────────

    /// @notice Get all confession IDs for a recipient
    /// @param _recipientId The recipient's platform ID
    /// @return Array of confession IDs addressed to this recipient
    function getInbox(uint256 _recipientId) external view returns (uint256[] memory) {
        return inbox[_recipientId];
    }

    /// @notice Get confession metadata (no encrypted data exposed)
    /// @param _confessionId ID of the confession
    /// @return recipientId Recipient's platform ID
    /// @return messageRef Off-chain message pointer
    /// @return platform Platform enum value
    /// @return timestamp Creation timestamp
    /// @return guessesUsed Number of guesses consumed
    /// @return revealed Whether identity has been revealed
    /// @return isPublic Whether this is a public confession
    /// @return revealPrice ETH threshold for community unmask
    /// @return revealPool Current reveal pool balance
    /// @return blockPool Current block pool balance
    function getConfessionMeta(uint256 _confessionId) external view returns (
        uint256 recipientId,
        bytes32 messageRef,
        uint8 platform,
        uint256 timestamp,
        uint8 guessesUsed,
        bool revealed,
        bool isPublic,
        uint256 revealPrice,
        uint256 revealPool,
        uint256 blockPool
    ) {
        Confession storage c = confessions[_confessionId];
        return (
            c.recipientId, c.messageRef, c.platform, c.timestamp,
            c.guessesUsed, c.revealed, c.isPublic,
            c.revealPrice, c.revealPool, c.blockPool
        );
    }

    /// @notice Check if a guess is pending resolution
    /// @param _confessionId ID of the confession
    /// @return True if there is a pending unresolved guess
    function isGuessPending(uint256 _confessionId) external view returns (bool) {
        return latestGuess[_confessionId].pending;
    }

    /// @notice Get the current hint level for a confession
    /// @param _confessionId ID of the confession
    /// @return Current hint level (0-5)
    function getHintLevel(uint256 _confessionId) external view returns (uint8) {
        return hintLevels[_confessionId];
    }

    /// @notice Get the price for the next hint
    /// @param _confessionId ID of the confession
    /// @return Price in wei, or 0 if all hints purchased
    function getNextHintPrice(uint256 _confessionId) external view returns (uint256) {
        uint8 level = hintLevels[_confessionId];
        if (level >= 5) return 0;
        return hintPrices[level];
    }

    /// @notice Get total number of confessions
    /// @return Total confession count
    function getConfessionCount() external view returns (uint256) {
        return confessionCount;
    }

    /// @notice Get all public confession IDs
    /// @return Array of public confession IDs for enumeration
    function getPublicConfessionIds() external view returns (uint256[] memory) {
        return publicConfessionIds;
    }

    /// @notice Get the number of public confessions
    /// @return Count of public confessions
    function getPublicConfessionCount() external view returns (uint256) {
        return publicConfessionIds.length;
    }

    /// @notice Get the number of reveal contributions for a confession
    /// @param _confessionId ID of the confession
    /// @return Number of individual reveal contributions
    function getRevealContributionCount(uint256 _confessionId) external view returns (uint256) {
        return revealContributions[_confessionId].length;
    }

    /// @notice Get a specific reveal contribution
    /// @param _confessionId ID of the confession
    /// @param _index Index of the contribution
    /// @return contributor Address of the contributor
    /// @return amount Amount contributed in wei
    function getRevealContribution(uint256 _confessionId, uint256 _index) external view returns (
        address contributor,
        uint256 amount
    ) {
        Contribution storage contrib = revealContributions[_confessionId][_index];
        return (contrib.contributor, contrib.amount);
    }

    /// @notice Check whether a confession's pools have been settled
    /// @param _confessionId ID of the confession
    /// @return True if pools have been distributed or refunded
    function isSettled(uint256 _confessionId) external view returns (bool) {
        return confessions[_confessionId].settled;
    }

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Propose a new treasury address (step 1 of 2)
    /// @dev Only the current treasury can propose. The proposed address must accept.
    /// @param _newTreasury Address of the proposed new treasury
    function proposeTreasury(address _newTreasury) external onlyTreasury {
        if (_newTreasury == address(0)) revert ZeroAddress();
        pendingTreasury = _newTreasury;
        emit TreasuryProposed(treasury, _newTreasury);
    }

    /// @notice Accept treasury role (step 2 of 2)
    /// @dev Only the pending treasury address can call this to complete the transfer.
    function acceptTreasury() external {
        if (pendingTreasury == address(0)) revert NoPendingTreasury();
        if (msg.sender != pendingTreasury) revert OnlyPendingTreasury();

        address oldTreasury = treasury;
        treasury = pendingTreasury;
        pendingTreasury = address(0);

        emit TreasuryAccepted(oldTreasury, treasury);
    }

    /// @notice Update the registrar address
    /// @dev Only the current treasury can change the registrar.
    /// @param _newRegistrar Address of the new registrar
    function setRegistrar(address _newRegistrar) external onlyTreasury {
        if (_newRegistrar == address(0)) revert ZeroAddress();
        registrar = _newRegistrar;
    }

    /// @notice Withdraw accumulated treasury balance
    /// @dev Only withdraws funds that belong to treasury (hint payments, reveal pool proceeds).
    ///      Does NOT touch active pool balances — those are tracked separately.
    function withdrawTreasury() external nonReentrant onlyTreasury {
        uint256 amount = treasuryBalance;
        if (amount == 0) revert NothingToWithdraw();

        treasuryBalance = 0;
        _safeTransfer(treasury, amount);

        emit TreasuryWithdrawn(treasury, amount);
    }

    /// @notice Emergency withdraw of only the treasury's accumulated balance
    /// @dev FIX #4: Does NOT drain active pool balances. Only touches treasuryBalance.
    ///      This is a safety function — identical to withdrawTreasury but named for clarity.
    function emergencyWithdraw() external nonReentrant onlyTreasury {
        uint256 amount = treasuryBalance;
        if (amount == 0) revert NothingToWithdraw();

        treasuryBalance = 0;
        _safeTransfer(treasury, amount);

        emit TreasuryWithdrawn(treasury, amount);
    }

    // ─── Internal Helpers ────────────────────────────────────────────────

    /// @dev Safe ETH transfer with failure revert
    /// @param _to Recipient address
    /// @param _amount Amount in wei
    function _safeTransfer(address _to, uint256 _amount) internal {
        (bool sent,) = _to.call{value: _amount}("");
        if (!sent) revert TransferFailed();
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
