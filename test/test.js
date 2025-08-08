const { v4: uuidv4 } = require('uuid');
const CryptoJS = require('crypto-js');
const { expect } = require('chai');
var request = require('supertest');
var app = require('../app');
var test = request(app);

getRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

describe('1. Test if App is running', function () {
    it('respond with hello world', function (done) {
        test.get('/api/v1').expect({ message: 'hello world' }, done);
    });
});

describe('2. Test Login', function () {
    it('Without Username', async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(401);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Invalid username or password.');
    });
    it('Without Password', async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(401);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Invalid username or password.');
    });
    it('With Incorrect Username', async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: 'admin',
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(401);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Invalid username or password.');
    });
    it('With Incorrect Password', async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: 'admin',
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(401);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Invalid username or password.');
    });
    it('With Correct Credentials', async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
    });
});

describe('3. Users', function () {});
describe('3.1 Get Users', function () {
    var session = null;
    before(async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
        session = response.headers['set-cookie'][0];
    });
    it('Without Token', async function () {
        const response = await test.get('/api/v1/users').set('Accept', 'application/json');
        expect(response.status).to.eql(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Unauthorized.');
    });
    it('With Invalid Token', async function () {
        const response = await test
            .get('/api/v1/users')
            .set('Accept', 'application/json')
            .set('Cookie', 'auth=invalid');
        expect(response.status).to.eql(401);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Unauthorized.');
    });
    it('With Valid Token', async function () {
        const response = await test.get('/api/v1/users').set('Accept', 'application/json').set('Cookie', session);
        expect(response.status).to.eql(200);
        expect(response.body).to.be.an('array');
        expect(response.body[0]).to.have.property('username');
    });
});
const testUser = {
    username: 'test',
    upiid: 'test@upi',
    password: 'test',
    role: 'user',
};
describe('3.2 Create User', function () {
    var session = null;
    before(async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
        session = response.headers['set-cookie'][0];
    });
    it('Create Test User', async function () {
        const response = await test
            .put('/api/v1/users')
            .send(testUser)
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(201);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('User created successfully.');
    });
    it('Create User with Duplicate UPI ID', async function () {
        const bogusUser = structuredClone(testUser);
        bogusUser.username = 'test1'; // Change username to avoid duplicate username error
        const response = await test
            .put('/api/v1/users')
            .send(bogusUser) // Send bogusUser with duplicate upiid
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Duplicate User.');
    });
    it('Create User with Duplicate Username', async function () {
        const bogusUser = structuredClone(testUser);
        bogusUser.upiid = 'test1@upi'; // Change upiid to avoid duplicate upiid error
        const response = await test
            .put('/api/v1/users')
            .send(bogusUser) // Send bogusUser with duplicate username
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Duplicate User.');
    });
});

describe('3.3 Update User', function () {
    var session = null;
    before(async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
        session = response.headers['set-cookie'][0];
    });
    it('Update UPI ID', async function () {
        testUser.upiid = 'test1@upi'; // Change upiid to test update
        const response = await test
            .post('/api/v1/users/' + testUser.username)
            .send({ upiid: testUser.upiid })
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('User updated successfully.');
    });
    it('Attempt to update Password', async function () {
        testUser.password = 'test1'; // Change password to test update
        const response = await test
            .post('/api/v1/users/' + testUser.username)
            .send({ password: testUser.password })
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('User updated successfully.');
    });
    it('Attempt to update Non-Existent User', async function () {
        const response = await test
            .post('/api/v1/users/' + 'test1')
            .send({ upiid: testUser.upiid })
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(404);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('User not found.');
    });
});
describe('3.4 Delete User', function () {
    var session = null;
    before(async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
        session = response.headers['set-cookie'][0];
    });
    it('Delete Non-Existent User', async function () {
        const response = await test
            .delete('/api/v1/users/' + 'test1')
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('User does not exist.');
    });
    it('Delete User', async function () {
        const response = await test
            .delete('/api/v1/users/' + testUser.username)
            .set('Accept', 'application/json')
            .set('Cookie', session);
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Successfully deleted user.');
    });
});
testPayInOrder = {
    customerName: 'John Doe',
    customerIp: '192.168.1.120',
    customerMobile: '9876543120',
    customerUPIID: 'john@upi',
    merchantOrderID: uuidv4(),
    amount: getRandomNumber(500, 10000),
    type: 'payin',
    mode: 'upi',
};
describe('4 Orders', function () {});
describe('4.1 Create PayIn Order', function () {
    it('Create PayIn Order', async function () {
        var hash = CryptoJS.enc.Base64.stringify(
            CryptoJS.HmacSHA256(JSON.stringify(testPayInOrder), process.env.CLIENT_SECRET),
        );
        const response = await test
            .put('/api/v1/orders')
            .set('x-key', process.env.CLIENT_KEY)
            .set('x-hash', hash)
            .send(testPayInOrder);
        expect(response.status).to.eql(201);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Order created successfully.');
    });
    it('Create PayIn Order with Duplicate Order ID', async function () {
        var hash = CryptoJS.enc.Base64.stringify(
            CryptoJS.HmacSHA256(JSON.stringify(testPayInOrder), process.env.CLIENT_SECRET),
        );
        const response = await test
            .put('/api/v1/orders')
            .set('x-key', process.env.CLIENT_KEY)
            .set('x-hash', hash)
            .send(testPayInOrder);
        expect(response.status).to.eql(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Duplicate Order ID');
    });
});
describe('4.2 Approve PayIn Order', function () {
    var session = null;
    var refID = null;
    before(async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
        session = response.headers['set-cookie'][0];
        const db = require('../db');

        db.query(
            'SELECT * FROM orders WHERE merchantOrderID = ?',
            [testPayInOrder.merchantOrderID],
            await function (error, results) {
                console.log('DB Query completed');
                if (error) throw error;
                expect(results.length).to.eql(1);
                expect(results[0].paymentStatus).to.eql('pending');
                refID = results[0].refID;
            },
        );
    });
    it('Approve PayIn Order', async function () {
        const response = await test
            .post('/api/v1/orders/' + refID)
            .send({ transactionID: uuidv4() })
            .set('Cookie', session);
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Order approved successfully.');
    });
    it('Approve Non-Existent Order', async function () {
        const response = await test
            .post('/api/v1/orders/' + 'test1')
            .send({ transactionID: uuidv4() })
            .set('Cookie', session);
        expect(response.status).to.eql(404);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Order not found.');
    });
});
describe('4.3 Get all PayIn Orders', function () {
    var session = null;
    before(async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
        session = response.headers['set-cookie'][0];
    });
    it('Get all PayIn Orders', async function () {
        const response = await test.get('/api/v1/orders/').set('Cookie', session);
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('data');
        expect(response.body).to.have.property('pagination');
        expect(response.body.data).to.be.an('array');
        expect(response.body.data.length).to.be.greaterThan(0);
    });
});
describe('4.4 Get PayIn Order by ID', function () {
    var session = null;
    var refID = null;
    before(async function () {
        const response = await test
            .post('/api/v1/login')
            .send({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
            })
            .set('Accept', 'application/json');
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('token');
        expect(response.headers['set-cookie'][0]).to.match(/^auth=/);
        session = response.headers['set-cookie'][0];
        const db = require('../db');

        db.query(
            'SELECT * FROM orders WHERE merchantOrderID = ?',
            [testPayInOrder.merchantOrderID],
            function (error, results) {
                console.log('DB Query completed');
                if (error) throw error;
                expect(results.length).to.eql(1);
                expect(results[0].paymentStatus).to.eql('approved');
                refID = results[0].refID;
            },
        );
    });
    it('Get PayIn Order by ID', async function () {
        const response = await test.get('/api/v1/orders/' + refID);
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property('refID');
        expect(response.body.paymentStatus).to.eql('approved');
    });
    it('Get Non-Existent Order', async function () {
        const response = await test.get('/api/v1/orders/' + 'test1');
        expect(response.status).to.eql(404);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Order not found.');
    });
});
testPayOutOrder = {
    customerName: 'Jane Doe',
    customerIp: '10.10.10.120',
    customerMobile: '0123456789',
    customerUPIID: 'jane@upi',
    merchantOrderID: uuidv4(),
    amount: getRandomNumber(500, 10000),
    type: 'payout',
    mode: 'upi',
};
describe('4.5 Create PayOut Order', function () {
    it('Create PayOut Order', async function () {
        var hash = CryptoJS.enc.Base64.stringify(
            CryptoJS.HmacSHA256(JSON.stringify(testPayOutOrder), process.env.CLIENT_SECRET),
        );
        const response = await test
            .put('/api/v1/orders')
            .set('x-key', process.env.CLIENT_KEY)
            .set('x-hash', hash)
            .send(testPayOutOrder);
        expect(response.status).to.eql(201);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Order created successfully.');
    });
    it('Create PayOut Order with Duplicate Order ID', async function () {
        var hash = CryptoJS.enc.Base64.stringify(
            CryptoJS.HmacSHA256(JSON.stringify(testPayOutOrder), process.env.CLIENT_SECRET),
        );
        const response = await test
            .put('/api/v1/orders')
            .set('x-key', process.env.CLIENT_KEY)
            .set('x-hash', hash)
            .send(testPayOutOrder);
        expect(response.status).to.eql(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.eql('Duplicate Order ID');
    });
});
