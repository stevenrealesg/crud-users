const mongoose = require('mongoose')
const express = require('express')
const morgan = require('morgan')
const { join } = require('path')

let path = process.cwd()

const app = express();
const port = process.env.PORT || 3000

// conexion a db
mongoose.connect('mongodb+srv://stevenr:reales123@cluster0-1rhnv.mongodb.net/test?retryWrites=true&w=majority')
.then(db => console.log('Base de datos Conectada'))
.catch(err => console.log(err))

const indexRoutes = require('./routes/')

// Midellewares
app.use(morgan('dev'))
app.use(express.urlencoded({extended: false}))

// rutas
app.use('/api/v1', indexRoutes)

// directorios estaticos
app.use('/files', express.static(join(path, 'src', 'files')))

// Iniciando servidor
app.listen(port, () => console.log(`Server on  ${port}`))