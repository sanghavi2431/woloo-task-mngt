module.exports = {
    apps : [{
        name      : 'WHMS-API',
        script    : './bin/app.js',
        node_args : '-r dotenv/config'
    }],
}
