const { ethers } = require('hardhat');
const { expect } = require('chai');

const tokenSup = (n) => {
    return ethers.utils.parseUnits(n.toString(),'ether');
}

describe('Exchange', () => {
    let deployer, feeAccount, exchange;
    const feePercent = 10;

    beforeEach(async () => {
        const Exchange = await ethers.getContractFactory('Exchange');
        const Token = await ethers.getContractFactory('Token');

        token1 = await Token.deploy('HIT Token', 'HIT', '1000000');
        token2 = await Token.deploy('Mock Dollar', 'MDL', '1000000');

        accounts = await ethers.getSigners();
        deployer = accounts[0];
        feeAccount = accounts[1];
        user1 = accounts[2];
        user2 = accounts[3];

        let transaction = await token1.connect(deployer).transfer(user1.address, tokenSup(100));
        await transaction.wait();

        exchange = await Exchange.deploy(feeAccount.address, feePercent);
    })

    describe('Deployment', () => {

        it('tracks the fee account', async () => {
        expect(await exchange.feeAccount()).to.equal(feeAccount.address);
        })

        it('tracks the fee percent', async () => {
        expect(await exchange.feePercent()).to.equal(feePercent);
        })
     })

     describe('Depositing Tokens', () => {
        let transaction, result;
        let amount = tokenSup(10);

        describe('Success', () => { 
            beforeEach(async () => {
            // Approve Token    
            transaction = await token1.connect(user1).approve(exchange.address, amount);
            result = await transaction.wait();
            // Deposit Token
            transaction = await exchange.connect(user1).depositTokens(token1.address, amount);
            result = await transaction.wait()
        })

            it('tracks the token deposit', async () => {
                expect(await token1.balanceOf(exchange.address)).to.equal(amount);
                expect(await exchange.tokens(token1.address, user1.address)).to.equal(amount);
                expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount);
            })

            it('emits a Deposit event', async () =>{
                const event = result.events[1];
                expect(event.event).to.equal('Deposit');

                const args = event.args;
                expect(args.token).to.equal(token1.address);
                expect(args.user).to.equal(user1.address);
                expect(args.amount).to.equal(amount);
                expect(args.balance).to.equal(amount);
            })
         })

        describe('Failure', () => { 
            it('fail when no tokens are approved', async () =>{
            // Don't approve any tokens before depositing    
            await expect(exchange.connect(user1).depositTokens(token1.address,amount)).to.be.reverted;    
            })
        })
     })

     describe('Withdrawing Tokens', () => {
        let transaction, result;
        let amount = tokenSup(10);

        describe('Success', () => { 

            beforeEach(async () => {
            //Approve token
            transaction = await token1.connect(user1).approve(exchange.address, amount);
            result = await transaction.wait();
            
            //Deposit token
            transaction = await exchange.connect(user1).depositTokens(token1.address, amount);
            result = await transaction.wait()

            //Withdraw tokens
            transaction = await exchange.connect(user1).withdrawTokens(token1.address, amount);
            result = await transaction.wait();
        })

            it('withdraws token funds', async () => {
                expect(await token1.balanceOf(exchange.address)).to.equal(0);
                expect(await exchange.tokens(token1.address, user1.address)).to.equal(0);
                expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(0);
            })

            it('emits a Withdraw event', async () =>{
                const event = result.events[1];
                expect(event.event).to.equal('Withdraw');

                const args = event.args;
                expect(args.token).to.equal(token1.address);
                expect(args.user).to.equal(user1.address);
                expect(args.amount).to.equal(amount);
                expect(args.balance).to.equal(0);
            })

         })

        describe('Failure', () => { 
            it('fails for insufficient balance', async () =>{
            //Attempt to withdraw tokens without depositing
            await expect(exchange.connect(user1).withdrawTokens(token1.address,amount)).to.be.reverted;    
            })
        })
     })

     describe('Checking Balances', () => {
        let transaction, result;
        let amount = tokenSup(1);

        beforeEach(async () => {
            //Approve token
            transaction = await token1.connect(user1).approve(exchange.address, amount);
            result = await transaction.wait();
            
            //Deposit token
            transaction = await exchange.connect(user1).depositTokens(token1.address, amount);
            result = await transaction.wait()
        })

        it('returns user balance', async () => {
            expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(amount);
        })
     })

     describe('Making Orders', () => {
        let transaction, result;
        let amount = tokenSup(1);

        describe('Success', () => { 

            beforeEach(async () => {
                //Deposit tokens before making order

                //Approve token
                transaction = await token1.connect(user1).approve(exchange.address, amount);
                result = await transaction.wait();
            
                //Deposit token
                transaction = await exchange.connect(user1).depositTokens(token1.address, amount);
                result = await transaction.wait();

                //Make Order
                transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount);
                result = await transaction.wait();
            })

            it('tracks the newly created order', async () => {
                expect(await exchange.orderCount()).to.equal(1);
            })

            it('emits a Order event', async () =>{
                const event = result.events[0];
                expect(event.event).to.equal('Order');

                const args = event.args;
                expect(args.id).to.equal(1);
                expect(args.user).to.equal(user1.address);
                expect(args.tokenGet).to.equal(token2.address);
                expect(args.amountGet).to.equal(tokenSup(1));
                expect(args.tokenGive).to.equal(token1.address);
                expect(args.amountGive).to.equal(tokenSup(1));
                expect(args.timestamp).to.at.least(1);
            })

         })

        describe('Failure', () => { 
            it('rejects orders with no balance', async () => {
                await expect(exchange.connect(user1).makeOrder(token1.address, tokenSup(1), token2.address, tokenSup(1))).to.be.reverted;
            })
        })
     })

     describe('Order Actions', () => {

        let transaction, result;
        let amount = tokenSup(1);

        beforeEach(async () => {
                //Approve token user1
                transaction = await token1.connect(user1).approve(exchange.address, amount);
                result = await transaction.wait();
            
                //Deposit tokens user1
                transaction = await exchange.connect(user1).depositTokens(token1.address, amount);
                result = await transaction.wait();

                // Give tokens to user2
                transaction = await token2.connect(deployer).transfer(user2.address, tokenSup(100));
                result = await transaction.wait();

                // User2 deposits tokens
                transaction = await token2.connect(user2).approve(exchange.address, tokenSup(2));
                result = await transaction.wait();

                transaction = await exchange.connect(user2).depositTokens(token2.address, tokenSup(2));
                result = await transaction.wait();

                //Make Order
                transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount);
                result = await transaction.wait();
            })


        describe('Cancelling Orders', () => {
            beforeEach(async () => {
                transaction = await exchange.connect(user1).cancelOrder(1);
                result = await transaction.wait();
            })
            describe('Success', () => {

                it('updates canceled orders', async () => {
                expect(await exchange.orderCancelled(1)).to.equal(true);
                })

                it('emits a Cancel event', async () =>{
                const event = result.events[0];
                expect(event.event).to.equal('Cancel');

                const args = event.args;
                expect(args.id).to.equal(1);
                expect(args.user).to.equal(user1.address);
                expect(args.tokenGet).to.equal(token2.address);
                expect(args.amountGet).to.equal(tokenSup(1));
                expect(args.tokenGive).to.equal(token1.address);
                expect(args.amountGive).to.equal(tokenSup(1));
                expect(args.timestamp).to.at.least(1);
            })
            })

            describe('Failure', () => {

                beforeEach(async () => {
                    //Approve token
                    transaction = await token1.connect(user1).approve(exchange.address, amount);
                    result = await transaction.wait();
                
                    //Deposit token
                    transaction = await exchange.connect(user1).depositTokens(token1.address, amount);
                    result = await transaction.wait();

                    //Make Order
                    transaction = await exchange.connect(user1).makeOrder(token2.address, amount, token1.address, amount);
                    result = await transaction.wait();
                })
                
                it('rejects invalid order ids', async () => {
                    const invalidIdOrderId = 99999;
                    await expect(exchange.connect(user1).cancelOrder(invalidIdOrderId)).to.be.reverted;
                })

                it('rejects unauthorized cancellations', async () => {
                    await expect(exchange.connect(user2).cancelOrder(1)).to.be.reverted;
                })

            })
        })

        describe('Filling orders', async () => {
            describe('Success', () => {
                beforeEach(async () => {
                // User2 fills order
                transaction = await exchange.connect(user2).fillOrder('1');
                result = await transaction.wait();
                })

                it('executes the trade and charges fees', async () => {
                    // Checking balances of token Give
                    expect(await exchange.balanceOf(token1.address, user1.address)).to.equal(tokenSup(0));
                    expect(await exchange.balanceOf(token1.address, user2.address)).to.equal(tokenSup(1));
                    expect(await exchange.balanceOf(token1.address, feeAccount.address)).to.equal(tokenSup(0));

                    // Checking balances of token Get
                    expect(await exchange.balanceOf(token2.address, user1.address)).to.equal(tokenSup(1));
                    expect(await exchange.balanceOf(token2.address, user2.address)).to.equal(tokenSup(0.9));
                    expect(await exchange.balanceOf(token2.address, feeAccount.address)).to.equal(tokenSup(0.1));
                })

                it('updates filled orders', async () =>{
                    expect(await exchange.orderFilled(1)).to.equal(true);
                })

                it('emits a Trade event', async () =>{
                    const event = result.events[0];
                    expect(event.event).to.equal('Trade');

                    const args = event.args;
                    expect(args.id).to.equal(1);
                    expect(args.user).to.equal(user2.address);
                    expect(args.tokenGet).to.equal(token2.address);
                    expect(args.amountGet).to.equal(tokenSup(1));
                    expect(args.tokenGive).to.equal(token1.address);
                    expect(args.amountGive).to.equal(tokenSup(1));
                    expect(args.creator).to.equal(user1.address)
                    expect(args.timestamp).to.at.least(1);
                })
            })

            describe('Failure', () => {
                it('rejects invalid order ids', async () => {
                    const invalidOrderId = 99999;
                    await expect(exchange.connect(user2).fillOrder(invalidOrderId)).to.be.reverted;
                })

                it('rejects already filled orders', async () => {
                    transaction = await exchange.connect(user2).fillOrder(1);
                    await transaction.wait();

                    await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted;
                })

                it('rejects cancelled orders', async () => {
                    transaction = await exchange.connect(user1).cancelOrder(1);
                    await transaction.wait();

                    await expect(exchange.connect(user2).fillOrder(1)).to.be.reverted;
                })
            })
        })
     })
})