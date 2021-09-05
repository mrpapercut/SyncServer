import SyncServer from '../src/SyncServer';

let syncServer: SyncServer = null;
const uuids: {
    [key: string]: object
} = {};

beforeAll(async () => {
    syncServer = new SyncServer('testdb');

    await syncServer.init();
});

describe('SyncServer::getUUID', () => {
    test('getUUID', async () => {
        const uuid = await syncServer.getUUID();

        expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });
});

describe('SyncServer::upsert', () => {
    test('Insert a new row with stringified JSON', async () => {
        const values = {
            appname: 'testapp',
            type: 'misc',
            syncdata: JSON.stringify({
                test: true,
                number: 1,
                string: 'text',
                object: {
                    key: 'value'
                },
                array: ['a', 1, 'b', 2, 'c', 3]
            })
        }

        const insertResult = await syncServer.upsert(values);
        const storedResult = await syncServer.getByUUID(insertResult.apptoken);

        expect(storedResult).toMatchObject({
            appname: expect.stringMatching(/^[a-zA-Z0-9]+$/),
            apptoken: expect.stringMatching(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/),
            type: expect.stringMatching(/^config|savegame|misc$/),
            timestamp: expect.any(Number),
            syncdata: expect.stringMatching(/^\{.*\}$/)
        });

        if (!uuids.hasOwnProperty(storedResult.apptoken)) {
            uuids[storedResult.apptoken] = storedResult;
        }
    });

    test('Update existing row with stringified JSON', async () => {
        const existingRow = await syncServer.getByUUID(Object.keys(uuids)[0]);
        const existingData = JSON.parse(existingRow.syncdata);

        existingData.string = 'new text';

        existingRow.syncdata = JSON.stringify(existingData);

        const updateResult = await syncServer.upsert(existingRow);
        const storedResult = await syncServer.getByUUID(updateResult.apptoken);

        uuids[storedResult.apptoken] = storedResult;

        expect(updateResult).toMatchObject({
            appname: expect.stringMatching(/^[a-zA-Z0-9]+$/),
            apptoken: expect.stringMatching(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/),
            type: expect.stringMatching(/^config|savegame|misc$/),
            timestamp: expect.any(Number),
            syncdata: JSON.stringify(existingData)
        });
    });
});

describe('SyncServer::getAllRows', () => {
    test('Get all rows', async () => {
        const rows = await syncServer.getAllRows();

        expect(rows.length).toBe(1);
    });
});

describe('SyncServer::getByUUID', () => {
    test('Get by UUID', async () => {
        for (const uuid in uuids) {
            const row = await syncServer.getByUUID(uuid);

            expect(row).toMatchObject(uuids[uuid]);
        }
    });
});
