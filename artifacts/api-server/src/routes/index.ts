import { Router, type IRouter } from "express";
import healthRouter from "./health";
import activitiesRouter from "./activities";
import challengesRouter from "./challenges";
import leaderboardRouter from "./leaderboard";
import coachRouter from "./coach";
import visionRouter from "./vision";

const router: IRouter = Router();

router.use(healthRouter);
router.use(activitiesRouter);
router.use(challengesRouter);
router.use(leaderboardRouter);
router.use(coachRouter);
router.use(visionRouter);

export default router;
