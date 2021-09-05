import express from 'express';

import SyncServer from './SyncServer';

const syncServer = new SyncServer();
const Router = express.Router();

Router.use(async (req, res, next) => {
    await syncServer.init();

    await next();

    // await syncServer.close();
});

Router.get('/all', async (req, res) => {
    const response = await syncServer.getAllRows();

    res.send(response);
});

Router.get('/uuid', async (req, res) => {
    const response = await syncServer.getUUID();

    res.send(response);
});

Router.get('/:uuid', async (req, res) => {
    const response = await syncServer.getByUUID(req.params.uuid);

    res.send(response);
});

Router.post('/update', async (req: any, res: express.Response) => {
    const response = await syncServer.upsert(req);

    res.send(response);
});

export default Router;
