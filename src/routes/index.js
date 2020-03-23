const mqtt = require('mqtt')
const express = require('express')
const { join } = require('path')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const bcrypt = require('bcryptjs')
const axios = require('axios');

const tokenizer = 'ilRQ3U25BWVEKLÑM/AS8DRFYAWS'

const router = express.Router()
// Cliente mqtt
const client = mqtt.connect('mqtt://mosquitto-prueba.u-wigo.com')
    .once('connect', () => console.log('mqtt connected!'))
    .subscribe('/messages')
    .on('message', async (topic, payload) => {
        if (topic == '/messages') {
            const message = new Message(JSON.parse(payload))
            await message.save()
            console.log('mensaje guardado')
        }
    })

let path = process.cwd()

let storage = multer.diskStorage({
    filename: (req, file, callback) => callback(null, `${Date.now().toString()}.png`),
    destination: (req, file, callback) => callback(null, join(path, 'src', 'files'))
})
let upload = multer({ storage })

const User = require('../models/user')
const Message = require('../models/message')
const Session = require('../models/session')


//Middleware login
const inSession = async (req, res, next) => {
    let { authorization } = req.headers
    if (!authorization) return res.status(401).send("Usted no tiene permisos.")

    let [type, token] = authorization.split(" ")
    let payload = jwt.verify(token, tokenizer, (err, decoded) => {
        if (err) res.status(401).send({ "Error": err })
        return decoded
    })
    if (payload) {
        let user = await User.findById(payload.id)
        const tokenUser = await Session.findOne({ user: user._id, token })
        if (tokenUser) {
            req.user = user
            next()
        } else {
            res.status(401).send("Token Invalido")
        }
    }
    else res.status(401).send("Usted no tiene permisos.")
}

//Cargar Imagen
router.patch('/users/:id/set/image', inSession, upload.single('file'), async (req, res) => {
    let { id } = req.params
    let { file } = req

    let user = await User.findByIdAndUpdate(id, { image: file.filename }, (err, user) => {
        if (err) res.status(500).send({ message: `Error al actualizar usuario: ${err}` })

        if (user) {
            res.status(200).send("Usuario Actualizado")
        } else {
            res.status(200).send("No hay usuario para actualizar")
        }
    })
})

//autentificacion
router.post('/authorization', async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email, visible: true, active: true })
    if (user) {
        if (bcrypt.compareSync(password, user.password)) {
            const token = jwt.sign({ id: user._id }, tokenizer, { expiresIn: '1h' })
            const session = new Session({ user: user._id, token })
            await session.save()
            res.status(200).send(token)
        }
        else res.status(200).send("Contraseña incorrecta")
    }
    else res.status(404).send("Usuario inexistente")
})

//eliminar autentificacion
router.get('/authorization', inSession, async (req, res) => {
    const { user } = req.body
    const session = await Session.remove({ user })
    if (session.deletedCount > 0) {
        res.status(200).send("Token de usuario desabilitado")
    }
    else res.status(200).send("no hay token para deshabilitar")
})

//Crear
router.post('/users', async (req, res) => {
    let salt = bcrypt.genSaltSync(12)
    req.body.password = bcrypt.hashSync(req.body.password, salt)
    const user = new User(req.body)
    await user.save()
    res.send("Usuario Guardado")
})

//Actualizar
router.put('/users/:id', inSession, async (req, res) => {
    const { id } = req.params
    const body = req.body
    let salt = bcrypt.genSaltSync(12)
    body.password = bcrypt.hashSync(body.password, salt)
    const user = await User.findOneAndUpdate(
        { _id: id, active: true },
        body,
        (err, user) => {
            if (err) res.status(500).send({ message: `Error al actualizar usuario: ${err}` })

            if (user) {
                res.status(200).send("Usuario Actualizado")
            } else {
                res.status(200).send("No hay usuario para actualizar")
            }
        }
    )
})

//Eliminar
router.delete('/users/:id', inSession, async (req, res) => {
    const { id } = req.params
    const user = await User.findOneAndUpdate(
        { _id: id },
        { visible: false, active: false },
        (err, user) => {
            if (err) res.status(500).send({ message: `Error al eliminar usuario: ${err}` })

            if (user) {
                res.status(200).send("Usuario Eliminado")
            } else {
                res.status(200).send("No hay usuario para eliminar")
            }
        }
    )
})

//Activar
router.patch('/users/:id/set/status/active/:active', inSession, async (req, res) => {
    const { id, active } = req.params
    const user = await User.findOneAndUpdate(
        { _id: id },
        { active },
        (err, user) => {
            if (err) res.status(500).send({ message: `Error al activar usuario: ${err}` })

            if (user) {
                res.status(200).send("Activacion Modificada")
            } else {
                res.status(200).send("No hay usuario para activar")
            }
        }
    )
})

//Visible
router.patch('/users/:id/set/status/visible/:visible', inSession, async (req, res) => {
    const { id, visible } = req.params
    const user = await User.findOneAndUpdate(
        { _id: id },
        { visible },
        (err, user) => {
            if (err) res.status(500).send({ message: `Error al cambiar visualizacion de usuario: ${err}` })

            if (user) {
                res.status(200).send("visualizacion Modificada")
            } else {
                res.status(200).send("No hay usuario para modificar")
            }
        }
    )
})

//Obtener usuario
router.get('/users/:id', inSession, async (req, res) => {
    const { id } = req.params
    if (id == 'me') {
        return res.status(200).send(req.user)
    }
    const user = await User.findById(id)
    if (user) {
        const infoCat = await API_Cats().then(data => {
            return data
        })
        res.status(200).send({ user, "Cats": infoCat })
    } else {
        res.status(200).send("No se encontro usuario")
    }
})

//Enviar Mensaje
router.post('/messages/send', inSession, async (req, res) => {
    client.publish('/messages', JSON.stringify(req.body))
    res.send("Mensaje enviado")
})

// Mostrar Mensaje
router.get('/messages', inSession, async (req, res) => {
    const messages = await Message.find().populate('user')
    if (messages && messages.length > 0) {
        const infoCat = await API_Cats().then(data => {
            return data
        })
        res.status(200).send({messages, "Cats": infoCat})
    } else {
        res.status(200).send("No se encontro mensajes")
    }
})

//API Externa
const API_Cats = async () => {
    try {
        return await axios.get('https://catfact.ninja/fact').then(response => {
            return response.data.fact
        })
    } catch (error) {
        console.error(error);
    }
}

module.exports = router