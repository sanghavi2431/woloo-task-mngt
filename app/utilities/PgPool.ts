import pg from "pg";
import config = require("../config");
import LOGGER from '../config/LOGGER';

export default class PgPool {
    private static _instance: PgPool;
    poolConnection: pg.Pool;
    connected: boolean = false;
    constructor() {
        this.poolConnection = new pg.Pool(config.Postgres_DB);
        this.connect();
        this.poolConnection.on('error', function (err: Error, _client: any) {
            console.log(`Idle-Client Error:\n${err.message}\n${err.stack}`)
        })
    }

    public static get instance() {
        return this._instance || (this._instance = new this());
    }

    // public static async execute_query(query: string, params: any[] = []): Promise<pg.QueryResult> {
    //     console.log(query,params)
    //     return await this.instance.poolConnection.query(query, params);
    // }
    public static async execute_query(query: string, params: any[] = []): Promise<pg.QueryResult> {
        console.log(query, params);
        const client = await this.instance.poolConnection.connect();
    
        try {
            const res = await client.query(query, params);
            return res;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        } finally {
            client.release();
        }
    }
    

    async connect(): Promise<pg.PoolClient> {
        console.log("connect")
        return await this.poolConnection.connect();
    }
}