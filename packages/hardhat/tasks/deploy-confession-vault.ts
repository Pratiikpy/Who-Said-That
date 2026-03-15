import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { saveDeployment } from './utils'

task('deploy-vault', 'Deploy the ConfessionVault V2 contract')
	.addOptionalParam('treasury', 'Treasury address for hint payments')
	.addOptionalParam('registrar', 'Registrar address for user registration')
	.setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
		const { ethers, network } = hre

		console.log(`Deploying ConfessionVault V2 to ${network.name}...`)

		const [deployer] = await ethers.getSigners()
		console.log(`Deploying with account: ${deployer.address}`)

		// V2: Constructor takes (treasury, registrar)
		// Default both to deployer if not specified
		const treasuryAddress = taskArgs.treasury || deployer.address
		const registrarAddress = taskArgs.registrar || deployer.address
		console.log(`Treasury: ${treasuryAddress}`)
		console.log(`Registrar: ${registrarAddress}`)

		const ConfessionVault = await ethers.getContractFactory('ConfessionVault')
		const vault = await ConfessionVault.deploy(treasuryAddress, registrarAddress)
		await vault.waitForDeployment()

		const vaultAddress = await vault.getAddress()
		console.log(`ConfessionVault V2 deployed to: ${vaultAddress}`)

		saveDeployment(network.name, 'ConfessionVaultV2', vaultAddress)

		// Verify version
		const version = await vault.version()
		console.log(`Contract version: ${version}`)

		return vaultAddress
	})
