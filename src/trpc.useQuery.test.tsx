import React from "react";
import {render, waitFor} from "@testing-library/react";
import {initTRPC} from "@trpc/server";
import {z} from "zod";
import {createTRPCReact, httpBatchLink} from "@trpc/react-query";
import {QueryCache, QueryClient, QueryClientProvider, UseQueryResult} from "@tanstack/react-query";
import {createHTTPServer} from "@trpc/server/dist/adapters/standalone";
import {Server} from "http";

const t = initTRPC.create();
const router = t.router;

const appRouter = router({
  pure: t.procedure
    .input((_: unknown) => {})
    .query(() => "data"),
  zod: t.procedure
    .input(z.object({k: z.string()}))
    .query(() => "data"),
});

const trpc = createTRPCReact<typeof appRouter>();

describe("tRPC", () => {
  let _httpServer: Server;
  let _httpUrl: string;
  let _queryCache: QueryCache;

  beforeAll(() => {
    const httpServer = createHTTPServer({
      router: appRouter,
      createContext: ({req, res}) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        return ({req, res});
      },
      batching: {
        enabled: true,
      },
    });
    const {port: httpPort} = httpServer.listen(0);
    _httpUrl = `http://localhost:${httpPort}`;
    console.log(_httpUrl);

    _queryCache = new QueryCache();
    _httpServer = httpServer.server;
  });

  afterAll(() => {
    _httpServer.close();
  });


  const Provider = ({ui}: { ui: React.ReactElement }) => {
    const queryClient = new QueryClient({queryCache: _queryCache});
    const trpcClient = trpc.createClient({
      links: [
        httpBatchLink({
          url: _httpUrl,
        }),
      ],
    });
    return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {ui}
        </QueryClientProvider>
      </trpc.Provider>
    )
  };

  test("queryKey, queryHash の確認", async () => {
    const states: UseQueryResult<string>[] = [];
    const PurePage = () => {
      const state = trpc.pure.useQuery();
      states.push(state);
      return (
        <div>
          {state.data}, {"" + state.isStale}, {"" + state.isFetching}
        </div>
      );
    };

    const ZodPage = (props: { k: string }) => {
      const state = trpc.zod.useQuery(props);
      states.push(state);
      return (
        <div>
          {state.data}, {"" + state.isStale}, {"" + state.isFetching}
        </div>
      );
    };

    render(<Provider ui={<PurePage />} />);
    render(<Provider ui={<ZodPage k={"v"} />} />);
    render(<Provider ui={<ZodPage k={"v2"} />} />);

    await waitFor(() => expect(states.length).toBe(6));

    // QueryKey
    const queryKeys = _queryCache.getAll().map(v => v.queryKey);
    console.log(queryKeys);
    expect(queryKeys)
      .toMatchObject([
        [["pure"], {type: "query"}],
        [["zod"], {input: {k: "v"}, type: "query"}],
        [["zod"], {input: {k: "v2"}, type: "query"}],
      ]);

    // QueryHash
    const queryHash = _queryCache.getAll().map(v => v.queryHash);
    console.log(queryHash);
    expect(queryHash)
      .toMatchObject([
        '[["pure"],{"type":"query"}]',
        '[["zod"],{"input":{"k":"v"},"type":"query"}]',
        '[["zod"],{"input":{"k":"v2"},"type":"query"}]',
      ]);
  });

  test("queryKeyHashFnの型", async () => {

    const ZodPage = () => {
      const state = trpc.zod.useQuery({k: "v"}, {
        queryKeyHashFn: (key) => {
          expect(key.length).toBe(2);
          expect(key[0]).toMatchObject(["zod"]);

          // FIXME TypeScript が提示する型と実際のオブジェクトが一致していない
          expect(key[1]).toMatchObject({input: {k: "v"}, type: "query"});
          // エラーは出ないが、型が間違っている
          console.log(`queryKeyHashFn: key[1].k == ${key[1].k}`);
          expect(key[1]).toMatchObject({k: "v"});

          return "";
        }
      });
      return (
        <div>
          {state.data}, {"" + state.isStale}, {"" + state.isFetching}
        </div>
      );
    };

    render(<Provider ui={<ZodPage />} />);
  });
});

