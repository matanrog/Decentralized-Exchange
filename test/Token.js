const { ethers } = require('hardhat');
const { expect } = require('chai');

const tokenSup = (n) => {
    return ethers.utils.parseUnits(n.toString(),'ether');
}

describe('Token', () => {
    let token, accounts, deployer, receiver;

    beforeEach(async () => {
        //Fetch token from blockchain
        const Token = await ethers.getContractFactory('Token');
        token = await Token.deploy("HIT Token", "HIT", "1000000");

        accounts = await ethers.getSigners();
        deployer = accounts[0];
        receiver = accounts[1];
    })

    describe('Deployment', () => {

        const name = 'HIT Token';
        const symbol = 'HIT';
        const decimal = '18';
        const totalSupply = '1000000';

        it('has a correct name', async () => {
        //Check that the name is correct
        expect(await token.name()).to.equal(name);
        })

        it('has a correct symbol', async () => {
            //Check that the symbol is correct
            expect(await token.symbol()).to.equal(symbol);
        })

        it('has a correct decimals', async () => {
            //Check that the decimals are correct
            expect(await token.decimals()).to.equal(decimal);
        })

        it('has a correct total supply', async () => {
            //Check that the total supply is correct
            expect(await token.totalSupply()).to.equal(tokenSup(totalSupply));
        })

        it('assigns total supply to deployer', async () => {
            //Check that the total supply is correct
            expect(await token.balanceOf(deployer.address)).to.equal(tokenSup(totalSupply));
        })
    })

    describe('Sending Token', () => { 

        describe('Success', () => {
            let amount, transaction, result;

            beforeEach(async () => {
                amount = tokenSup(100);
                transaction = await token.connect(deployer).transfer(receiver.address, amount);
                result = await transaction.wait();
            })

            it('transfers token balances', async () => {
                expect(await token.balanceOf(deployer.address)).to.equal(tokenSup(999900));
                expect(await token.balanceOf(receiver.address)).to.equal(amount);
            })

            it('emits a Transfer event', async () =>{
                const event = result.events[0];
                expect(event.event).to.equal('Transfer');

                const args = event.args;
                expect(args.from).to.equal(deployer.address);
                expect(args.to).to.equal(receiver.address);
                expect(args.value).to.equal(amount);
            })
        })

        describe('Failure', () => { 

            it('rejects insufficient balances', async () =>{
                const invalidAmount = tokenSup(100000000);
                await expect (token.connect(deployer).transfer(receiver.address, invalidAmount)).to.be.reverted;
            })

            it('rejects invalid recipient', async () =>{
                const amount = tokenSup(100);
                await expect (token.connect(deployer).transfer('0x0000000000000000000000000000000000000000', amount)).to.be.reverted;
            })
            
        })
    })


})