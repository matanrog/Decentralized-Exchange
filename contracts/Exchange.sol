// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract Exchange {
    address public feeAccount;
    uint256 public feePercent;

    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    uint256 public orderCount;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    event Deposit(address token, address user, uint256 amount, uint256 balance);

    event Withdraw(
        address token,
        address user,
        uint256 amount,
        uint256 balance
    );

    event Order(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );

    event Cancel(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
    );

    event Trade(
        uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        address creator,
        uint256 timestamp
    );

    struct _Order {
        //Attributes under Order
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    constructor(address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // ------------------------
    // DEPOSIT & WITHDRAW TOKEN

    function depositTokens(address _token, uint256 _amount) public {
        //Transfer tokens to exchange
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));

        //Update user balance
        tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;

        //Emit an event
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawTokens(address _token, uint256 _amount) public {
        //Ensure user has enough tokens to withdraw
        require(tokens[_token][msg.sender] >= _amount);

        //Transfer tokens to user
        Token(_token).transfer(msg.sender, _amount);

        //Update user balance
        tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;

        //Emit event
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(
        address _token,
        address _user
    ) public view returns (uint256) {
        return tokens[_token][_user];
    }

    //Token Give - the token they want to spend
    //Token Get - the token they want to receive
    function makeOrder(
        address _tokenGet,
        uint256 _amountGet,
        address _tokenGive,
        uint256 _amountGive
    ) public {
        //Require token balance
        require(balanceOf(_tokenGive, msg.sender) >= _amountGive);

        //Create Order
        orderCount++;
        orders[orderCount] = _Order(
            orderCount, // id
            msg.sender, // user
            _tokenGet, // tokenGet
            _amountGet, // amountGet
            _tokenGive, // tokenGive
            _amountGive, // amountGive
            block.timestamp // timestamp
        );

        //Emit event
        emit Order(
            orderCount,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            block.timestamp
        );
    }

    function cancelOrder(uint256 _id) public {
        //Fetch order
        _Order storage _order = orders[_id];

        //Order must exist
        require(_order.id == _id);

        //Ensure the caller of the funcion is the owner of the order
        require(address(_order.user) == msg.sender);

        //Cancel the order
        orderCancelled[_id] = true;

        //Emit cancel Event
        emit Cancel(
            _order.id,
            msg.sender,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive,
            block.timestamp
        );
    }

    // Executing order

    function fillOrder(uint256 _id) public {
        // Valid orderId
        require(_id <= orderCount && _id > 0, "Order does not exist");
        // Order can't be filled
        require(!orderFilled[_id]);
        // Order can't be cancelled
        require(!orderCancelled[_id]);

        // Fetch Order
        _Order storage _order = orders[_id];

        // Swapping Tokens
        _trade(
            _order.id,
            _order.user,
            _order.tokenGet,
            _order.amountGet,
            _order.tokenGive,
            _order.amountGive
        );

        orderFilled[_order.id] = true;
    }

    function _trade(
        uint256 _orderId,
        address _user,
        address _tokenGet,
        uint256 _amountGet,
        address _tokenGive,
        uint256 _amountGive
    ) internal {
        // Fee is paid by the user who filled the order (msg.sender)
        //Fee is deducted from the _amountGet token
        uint256 _feeAmount = (_amountGet * feePercent) / 100;

        // Do trade here

        // One side of the trade
        tokens[_tokenGet][msg.sender] =
            tokens[_tokenGet][msg.sender] -
            (_amountGet + _feeAmount);
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user] + _amountGet;

        // Charge Fees
        tokens[_tokenGet][feeAccount] =
            tokens[_tokenGet][feeAccount] +
            _feeAmount;

        //Second side of the trade
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user] - _amountGive;
        tokens[_tokenGive][msg.sender] =
            tokens[_tokenGive][msg.sender] +
            _amountGive;

        // Emit trade event
        emit Trade(
            _orderId,
            msg.sender,
            _tokenGet,
            _amountGet,
            _tokenGive,
            _amountGive,
            _user,
            block.timestamp
        );
    }
}
