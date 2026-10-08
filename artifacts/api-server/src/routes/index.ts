import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notesRouter from "./notes";
import documentsRouter from "./documents";
import tasksRouter from "./tasks";
import projectsRouter from "./projects";
import decisionsRouter from "./decisions";
import contradictionsRouter from "./contradictions";
import graphRouter from "./graph";
import analyticsRouter from "./analytics";
import knowledgeRouter from "./knowledge";
import memoryRouter from "./memory";
import researchRouter from "./research";
import reasoningRouter from "./reasoning";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notesRouter);
router.use(documentsRouter);
router.use(tasksRouter);
router.use(projectsRouter);
router.use(decisionsRouter);
router.use(contradictionsRouter);
router.use(graphRouter);
router.use(analyticsRouter);
router.use(knowledgeRouter);
router.use(memoryRouter);
router.use(researchRouter);
router.use(reasoningRouter);
router.use(openaiRouter);

export default router;