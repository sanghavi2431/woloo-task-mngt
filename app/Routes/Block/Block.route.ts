import express from 'express';
import BlockController from "../../Controllers/Blocks.controller"
import BlockSchema from "../../Constants/Schema/Block.schema"
import { celebrate } from 'celebrate';
const router = express.Router();

router.post(
    '/insertBlock',
    celebrate(BlockSchema.insertBlock),
    BlockController.insertBlock,
);
router.post(
    '/getBlocks',
    celebrate(BlockSchema.getBlocks),
    BlockController.getBlocks,
);
router.get(
    '/getBlockById',
    celebrate(BlockSchema.getBlockById),
    BlockController.getBlockById,
);
router.put(
    '/deleteBlockById',
    celebrate(BlockSchema.deleteBlockById),
    BlockController.deleteBlockById,
);
router.put(
    '/updateBlock',
    celebrate(BlockSchema.updateBlock),
    BlockController.updateBlock,
);
router.get(
    '/getClients',
    BlockController.getClients,
);
router.get(
    '/getLocations',
    celebrate(BlockSchema.getLocations),
    BlockController.getLocations,
);

export default router;
