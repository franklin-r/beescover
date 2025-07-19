import { run } from "hardhat";

export const verify = async(contractAddress: string, args?: any[]): Promise<void> => {
	console.log('Verifying contract...');
	try {
		await run("verify:verify", {
			address: contractAddress,
			constructorArguments: args || []
		})
	}
	catch(e: any) {
		if(e.message.toLowerCase().includes('already verified')) {
			console.log('Contract already verified.');
		}
		else {
			console.error(e);
		}
	}
}

if (require.main === module) {
	(async () => {
		await verify("0x712b3EDc5230D7bBBBAA89F1abEbA85b93b956a2",
			[
				"BeesCover_poolId_0_Depeg_LPToken",
				"poolId_0_Depeg_LPT"
			]
		);
	})();
}