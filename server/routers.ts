import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { learningRouter } from "./routers/learning";
import { mcqRouter } from "./routers/mcq";
import { liveExamRouter } from "./routers/liveExam";
import { historicalRouter } from "./routers/historical";
import { aiGenerationRouter } from "./routers/aiGeneration";
import { examsRouter } from "./routers/exams";
import { subscriptionRouter } from "./routers/subscription";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  learning: learningRouter,
  historical: historicalRouter,
  aiGeneration: aiGenerationRouter,
  exams: examsRouter,
  mcq: mcqRouter,
  liveExam: liveExamRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
