const request = require("supertest")
const app = require('../app')
const User = require('../models/users')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
// initializing user
const id1 = new mongoose.Types.ObjectId()
const id2 = new mongoose.Types.ObjectId()
 
let dummyUser = {
    _id: id1,
    display_name: "Omar Taher",
    email: "omar@yahoo.com",
    password:"12345678",
    product:"free",
    type:"user",
    emailConfirmation: true,
}
let dummyUser1 = {
    _id: id2,
    display_name: "omar youssef",
    email: "omar1@yahoo.com",
    password:"12345678",
    product:"free",
    type:"user",
    emailConfirmation: false,
    tokens:{
        token: jwt.sign({_id : id2}, process.env.JWT_SECRET)
    }
}
let verifyPath  = jwt.sign({_id: id2}, process.env.JWT_VERIFY)
let forgotPath = jwt.sign({_id: id2}, process.env.JWT_FORGOTPASSWORD)
let upgradePath = jwt.sign({_id: id2}, process.env.JWT_UPGRADE)

beforeEach(async () => {
    await User.deleteMany({})
    await new User(dummyUser).save()
    await new User(dummyUser1).save()

})
test('Signing up', async () => {
    const response = await request(app)
        .post('/users/signUp')
        .send({
            "display_name": "omar",
            "email": "taher@yahoo.com",
            "password": "12345678",
            "product":"free",
            "type": "user"
    }).expect(201)
   
})
test('Signing up invaild email', async () => {
    const response = await request(app)
        .post('/users/signUp')
        .send({
            "display_name": "omar",
            "email": "taher@@yahoo.com",
            "password": "12345678",
            "product":"free",
            "type": "user"
    }).expect(400)
   
})

test('Signing up invaild password', async () => {
    const response = await request(app)
        .post('/users/signUp')
        .send({
            "display_name": "omar",
            "email": "taher@yahoo.com",
            "password": "password",
            "product":"free",
            "type": "user"
    }).expect(400)
   
})
test('Signing up invaild product', async () => {
    const response = await request(app)
        .post('/users/signUp')
        .send({
            "display_name": "omar",
            "email": "taher@yahoo.com",
            "password": "12345678",
            "product":"freee",
            "type": "user"
    }).expect(400)
   
})

test('Signing up invaild type', async () => {
    const response = await request(app)
        .post('/users/signUp')
        .send({
            "display_name": "omar",
            "email": "taher@yahoo.com",
            "password": "12345678",
            "product":"free",
            "type": "userr"
    }).expect(400)
   
})
test('verifing the account', async () => {
    const response = await request(app)
        .get('/verify?token='+verifyPath)
        .expect(200)
    const user = await User.findById(id2)
    expect(user.emailConfirmation).toBe(true)
   
})

test('verifing the account with wrong path', async () => {
    const response = await request(app)
        .get('/verify?token='+forgotPath)
        .expect(400)
    const user = await User.findById(id2)
    expect(user.emailConfirmation).toBe(false)
})


test('loging in', async () => {
    const response = await request(app)
        .post('/users/login')
        .send({
            "email": "omar@yahoo.com",
            "password": "12345678",
        }).expect(200)
    const user = await User.findById(response.body.userId)
    expect(user).not.toBeNull()
    expect(response.body.message).toBe("login successfully")
    expect(user.password).not.toBe('12345678')
})


test('loging in without mail', async () => {
    const response = await request(app)
        .post('/users/login')
        .send({
            "password": "12345678",
        }).expect(400)
})

test('loging in with invalid password', async () => {
    const response = await request(app)
        .post('/users/login')
        .send({
            "email": "omar@yahoo.com",
            "password": "123456789",
        }).expect(400)
})

test('forgot password', async () => {
    const response = await request(app)
        .post('/forgotPassword')
        .send({
            "email": "omar@yahoo.com",
        }).expect(200)
    expect(response.body.message).toBe("email sent")

})
test('entering new password', async () => {
    const response = await request(app)
        .post('/newPassword?token='+forgotPath)
        .send({
            "pswd": "87654321",
        }).expect(200)
    const user = await User.findById(id2)
    expect(await bcrypt.compare("87654321",user.password)).toBe(true)

})
test('entering new password with wrong path', async () => {
    const response = await request(app)
        .post('/newPassword?token='+verifyPath)
        .send({
            "pswd": "87654321",
        }).expect(400)
    const user = await User.findById(id2)
    expect(await bcrypt.compare("87654321",user.password)).not.toBe(true)

})


test('requesting upgrade', async () => {
    const user = await User.findById(id2)
    const response = await request(app).patch('/users/upgrade')
    .set('Authorization', `Bearer ${user.tokens[0].token}`)
    .expect(201)
  
})

test('requesting upgrade with invalid token', async () => {
    const user = await User.findById(id2)
    const response = await request(app).patch('/users/upgrade')
    .set('Authorization', `Bearer ${user.tokens[0].token}+abd`)
    .expect(401)
  
})

test('clicking on upgrade link', async () => {
    
    const response = await request(app)
    .get('/upgrade?token='+upgradePath)
    .expect(200)
    const user = await User.findById(id2)
    expect(user.product).toBe("premium")
  
})

test('clicking on invaild upgrade  link', async () => {
    
    const response = await request(app)
    .get('/upgrade?token='+verifyPath)
    .expect(400)
  
})
test('uploading image', async () => {
    const user = await User.findById(id2)
    const response = await request(app).post('/users/uploadprofile')
    .set('Authorization', `Bearer ${user.tokens[0].token}`)
    .attach('upload','src/tests/img/messi.jpeg')
    .expect(200)
    const user1 = await User.findById(id2)
    expect(user1.image).toEqual(expect.any(Buffer))
})
test('uploading pdf instead of image', async () => {
    const user = await User.findById(id2)
    const response = await request(app).post('/users/uploadprofile')
    .set('Authorization', `Bearer ${user.tokens[0].token}`)
    .attach('upload','src/tests/img/FinalExam.pdf')
    .expect(400)
})

test('requesting the image', async () => {
    const response = await request(app).get('/profile/'+id2)
    .expect(200)
})