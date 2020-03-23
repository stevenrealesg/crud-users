const mongoose = require('mongoose')
const Schema = mongoose.Schema

const UserSchema = new Schema({
    name: String,
    email:{
        type: String,
        require: true,
        unique: String
    },
    password: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    visible: {
        type: Boolean,
        default: true
    },
    active: {
        type: Boolean,
        default: true
    }
})

module.exports = mongoose.model('users', UserSchema)