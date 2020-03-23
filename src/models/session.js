const mongoose = require('mongoose')
const Schema = mongoose.Schema

const SessionSchema = new Schema({
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'users'
    },
    token: String
})

module.exports = mongoose.model('sessions', SessionSchema)