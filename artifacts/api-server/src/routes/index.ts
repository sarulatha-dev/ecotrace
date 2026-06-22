import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import activitiesRouter from "./activities.js";
import challengesRouter from "./challenges.js";
import leaderboardRouter from "./leaderboard.js";
import coachRouter from "./coach.js";
import visionRouter from "./vision.js";
import goalsRouter from "./goals.js";
import devicesRouter from "./devices.js";
import walletRouter from "./wallet.js";
import passiveRouter from "./passive.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(activitiesRouter);
router.use(challengesRouter);
router.use(leaderboardRouter);
router.use(coachRouter);
router.use(visionRouter);
router.use(goalsRouter);
router.use(devicesRouter);
router.use(walletRouter);
router.use(passiveRouter);

export default router;
