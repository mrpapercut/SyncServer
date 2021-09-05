/// <reference path="./types/SyncServer.d.ts" />

import path from 'path';
import {
    sqlite3,
    Database as sqlite3Database,
    RunResult, Statement
} from 'sqlite3';
import {
    open as sqliteOpen,
    Database as sqliteDatabase
} from 'sqlite';

import getUUID from './util/getUUID';

class SyncServer {
    db: sqliteDatabase;
    dbname: string;

    constructor(dbname: string = 'sync') {
        this.db = null;
        this.dbname = dbname;
    }

    async init(): Promise<void> {
        await this.#openDatabase();
    }

    ready(): boolean {
        return this.db instanceof sqliteDatabase;
    }

    async #openDatabase(): Promise<void> {
        this.db = await sqliteOpen({
            filename: path.resolve(__dirname, '../dbs/', `${this.dbname}.db`),
            driver: sqlite3Database
        });

        // Check if migrations need to be run
        const tables = await this.db.all('SELECT name FROM sqlite_master WHERE type="table"');
        if (! tables.find(t => t.name === 'Syncdata')) {
            await this.#migrate();
        }
    }

    async #migrate(forceClear: boolean = false) {
        if (this.ready()) {
            try {
                const migrated = await this.db.migrate({
                    force: forceClear,
                    migrationsPath: path.resolve(__dirname, '../migrations/')
                });

                return migrated;
            } catch (e) {
                throw e;
            }
        } else {
            throw Error('No database');
        }
    }

    async #insertRow(values: RowData): Promise<RowData> {
        const query = await this.db.prepare('INSERT INTO Syncdata (appname, apptoken, timestamp, type, syncdata) VALUES (@appname, @apptoken, @timestamp, @type, @syncdata)');
        const bindValues = {
            '@appname': values.appname,
            '@apptoken': values.apptoken,
            '@timestamp': +new Date,
            '@type': values.type,
            '@syncdata': values.syncdata
        };

        await query.bind(bindValues);

        try {
            const res = await query.run();

            return {
                appname: bindValues['@appname'],
                apptoken: bindValues['@apptoken'],
                timestamp: bindValues['@timestamp'],
                type: bindValues['@type'],
                syncdata: JSON.parse(bindValues['@syncdata'])
            };
        } catch (e) {
            throw e;
        }
    }

    async #updateRow(values: RowData): Promise<RowData> {
        const query = await this.db.prepare('UPDATE Syncdata SET timestamp = @timestamp, syncdata = @syncdata WHERE appname = @appname AND apptoken = @apptoken AND type = @type');
        const bindValues = {
            '@timestamp': +new Date,
            '@syncdata': values.syncdata,
            '@appname': values.appname,
            '@apptoken': values.apptoken,
            '@type': values.type
        };

        await query.bind(bindValues);

        try {
            const res = await query.run();

            return {
                appname: bindValues['@appname'],
                apptoken: bindValues['@apptoken'],
                timestamp: bindValues['@timestamp'],
                type: bindValues['@type'],
                syncdata: JSON.parse(bindValues['@syncdata'])
            };
        } catch (e) {
            throw e;
        }
    }

    getUUID(): string {
        const uuid = getUUID();

        return uuid;
    }

    async getAllRows(): Promise<RowData[]> {
        const query = await this.db.prepare('SELECT * FROM Syncdata');

        try {
            const res = await query.all();

            return res;
        } catch (e) {
            throw e;
        }
    }

    async getByUUID(uuid: string): Promise<RowData> {
        const query = await this.db.prepare('SELECT * FROM Syncdata WHERE apptoken = @apptoken');

        await query.bind({
            '@apptoken': uuid
        });

        try {
            const res = await query.get();

            return res;
        } catch (e) {
            throw e;
        }
    }

    async upsert({appname, apptoken = null, timestamp = null, type, syncdata}: RowData): Promise<RowData> {
        // If there's no apptoken, this should be an insert
        if (!apptoken) {
            apptoken = this.getUUID();
            const insertResult = await this.#insertRow({appname, apptoken, timestamp, type, syncdata});

            return insertResult;
        } else {
            const updateResult = await this.#updateRow({appname, apptoken, timestamp, type, syncdata});

            return {appname, apptoken, timestamp, type, syncdata};
        }
    }
}

export default SyncServer;
