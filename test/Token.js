const { ethers } = require('hardhat');
const { expect } = require('chai');

const tokenSup = (n) => {
    return ethers.utils.parseUnits(n.toString(),'ether');
}

describe('Token', () => {
    let token, accounts, deployer;
    
    beforeEach(async () => {
        //Fetch token from blockchain
        const Token = await ethers.getContractFactory('Token');
        token = await Token.deploy("HIT Token", "HIT", "1000000");

        accounts = await ethers.getSigners();
        deployer = accounts[0];
    })

    describe('Deployment', () => {

        const name = 'HIT Token';
        const symbol = 'HIT';
        const decimal = '18';
        const totalSupply = '1000000';

        it('Has a correct name', async () => {
        //Check that the name is correct
        expect(await token.name()).to.equal(name);
        })

        it('Has a correct symbol', async () => {
            //Check that the symbol is correct
            expect(await token.symbol()).to.equal(symbol);
        })

        it('Has a correct decimals', async () => {
            //Check that the decimals are correct
            expect(await token.decimals()).to.equal(decimal);
        })

        it('Has a correct total supply', async () => {
            //Check that the total supply is correct
            expect(await token.totalSupply()).to.equal(tokenSup(totalSupply));
        })

        it('Assigns total supply to deployer', async () => {
            //Check that the total supply is correct
            expect(await token.balanceOf(deployer.address)).to.equal(tokenSup(totalSupply));
        })
    })
})