export const CONFESSION_VAULT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_treasury",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_registrar",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AllHintsPurchased",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyResolved",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyRevealed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadySettled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BlockCapExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotGuessPublic",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConfessionNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DecryptNotReady",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "required",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "sent",
        "type": "uint256"
      }
    ],
    "name": "ExactPaymentRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "GuessNotTimedOut",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "GuessPendingResolve",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "got",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "expected",
        "type": "uint8"
      }
    ],
    "name": "InvalidEncryptedInput",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPlatform",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRecipient",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MinRevealPrice",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MustContribute",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoGuessPending",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoGuessesRemaining",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoPendingTreasury",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPublicConfession",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRevealed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NothingToWithdraw",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyGuesserOrRecipient",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyPendingTreasury",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyRecipient",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyRegistrar",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlySender",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyTreasury",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PlatformAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PoolNotExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "int32",
        "name": "value",
        "type": "int32"
      }
    ],
    "name": "SecurityZoneOutOfBounds",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "recipientId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "platform",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ConfessionSent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "guesser",
        "type": "address"
      }
    ],
    "name": "GuessCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "guesser",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "guessNumber",
        "type": "uint8"
      }
    ],
    "name": "GuessPending",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "guesser",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "correct",
        "type": "bool"
      }
    ],
    "name": "GuessResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "hintLevel",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      }
    ],
    "name": "HintPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      }
    ],
    "name": "IdentityRevealed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "revealed",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "revealPoolTotal",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "blockPoolTotal",
        "type": "uint256"
      }
    ],
    "name": "PoolSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "platform",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "revealPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PublicConfessionPosted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isRevealPool",
        "type": "bool"
      }
    ],
    "name": "RefundIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newBlockPool",
        "type": "uint256"
      }
    ],
    "name": "RevealBlocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "confessionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "contributor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalPool",
        "type": "uint256"
      }
    ],
    "name": "RevealContribution",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldTreasury",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newTreasury",
        "type": "address"
      }
    ],
    "name": "TreasuryAccepted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "current",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "proposed",
        "type": "address"
      }
    ],
    "name": "TreasuryProposed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TreasuryWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "platformId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "wallet",
        "type": "address"
      }
    ],
    "name": "UserRegistered",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BLOCK_CAP_MULTIPLIER",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "GUESS_TIMEOUT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_GUESSES",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_PLATFORM",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "POOL_EXPIRY",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "acceptTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "blockReveal",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "buyHint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "cancelPendingGuess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confessionCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "contributeToReveal",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getConfessionCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "getConfessionMeta",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "recipientId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "messageRef",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "platform",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "guessesUsed",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "revealed",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isPublic",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "revealPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "revealPool",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "blockPool",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "getHintLevel",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_recipientId",
        "type": "uint256"
      }
    ],
    "name": "getInbox",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "getNextHintPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPublicConfessionCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPublicConfessionIds",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_index",
        "type": "uint256"
      }
    ],
    "name": "getRevealContribution",
    "outputs": [
      {
        "internalType": "address",
        "name": "contributor",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "getRevealContributionCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "getRevealedSender",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "hintLevels",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "hintPrices",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "isGuessPending",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "isSettled",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingTreasury",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "platformWallet",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "ctHash",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "securityZone",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "utype",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct InEuint32",
        "name": "_encSenderId",
        "type": "tuple"
      },
      {
        "internalType": "bytes32",
        "name": "_messageRef",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "_platform",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "_revealPrice",
        "type": "uint256"
      }
    ],
    "name": "postPublic",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_newTreasury",
        "type": "address"
      }
    ],
    "name": "proposeTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "publicConfessionIds",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "refundExpiredPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_platformId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_wallet",
        "type": "address"
      }
    ],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registrar",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      }
    ],
    "name": "resolveGuess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "ctHash",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "securityZone",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "utype",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct InEuint32",
        "name": "_encSenderId",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "_recipientId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "_messageRef",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "_platform",
        "type": "uint8"
      }
    ],
    "name": "sendConfession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_newRegistrar",
        "type": "address"
      }
    ],
    "name": "setRegistrar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_confessionId",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "ctHash",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "securityZone",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "utype",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "signature",
            "type": "bytes"
          }
        ],
        "internalType": "struct InEuint32",
        "name": "_encGuess",
        "type": "tuple"
      }
    ],
    "name": "submitGuess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasury",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasuryBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "version",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;
