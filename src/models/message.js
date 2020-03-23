const mongoose = require('mongoose')
const Schema = mongoose.Schema

const MessageSchema = new Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },
    message: String
})

module.exports = mongoose.model('messages', MessageSchema)