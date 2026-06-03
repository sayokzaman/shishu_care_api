require('dotenv').config()

var { spawn } = require('child_process')
var mysql = require('mysql2/promise')

async function main() {
    var connectionUrl = new URL(process.env.DATABASE_URL)
    var databaseName = connectionUrl.pathname.replace(/^\//, '')

    if (!databaseName) {
        throw new Error('DATABASE_URL must include a database name')
    }

    var connection = await mysql.createConnection({
        host: connectionUrl.hostname,
        port: connectionUrl.port ? Number(connectionUrl.port) : 3306,
        user: decodeURIComponent(connectionUrl.username),
        password: decodeURIComponent(connectionUrl.password),
        multipleStatements: true
    })

    try {
        await connection.query('CREATE DATABASE IF NOT EXISTS ' + connection.escapeId(databaseName) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
    } finally {
        await connection.end()
    }

    await runCommand('pnpm', ['prisma:migrate'])
}

function runCommand(command, args) {
    return new Promise(function (resolve, reject) {
        var spawnCommand = command
        var spawnArgs = args

        if (command === 'pnpm' && process.env.npm_execpath) {
            spawnCommand = process.execPath
            spawnArgs = [process.env.npm_execpath].concat(args)
        }

        var child = spawn(spawnCommand, spawnArgs, {
            stdio: 'inherit',
            shell: false
        })

        child.on('error', reject)
        child.on('exit', function (code) {
            if (code === 0) {
                resolve()
                return
            }

            reject(new Error(command + ' ' + args.join(' ') + ' failed with exit code ' + code))
        })
    })
}

main().catch(function (error) {
    console.error(error.message)
    process.exit(1)
})
