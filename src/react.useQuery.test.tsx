import React from "react";
import {QueryCache, QueryClient, QueryClientProvider, useQuery, UseQueryResult} from "react-query";
import {render, waitFor} from "@testing-library/react";


export function renderWithClient(
  client: QueryClient,
  ui: React.ReactElement,
): ReturnType<typeof render> {
  const {rerender, ...result} = render(
    <QueryClientProvider client={client}>
      {ui}
    </QueryClientProvider>,
  );
  return {
    ...result,
    rerender: (rerenderUi: React.ReactElement) =>
      rerender(
        <QueryClientProvider client={client}>
          {rerenderUi}
        </QueryClientProvider>,
      ),
  } as any;
}

export function sleep(timeout: number): Promise<void> {
  return new Promise((resolve, _reject) => {
    setTimeout(resolve, timeout);
  });
}

describe("React", () => {
  const queryCache = new QueryCache();
  const queryClient = new QueryClient({queryCache});

  test("Array keys を使用した場合の queryKey, queryHash の確認", async () => {
    const states: UseQueryResult<string>[] = [];

    const Page = () => {
      const state = useQuery(["key", {k: "v"}], async () => {
        await sleep(10);
        return "data";
      });
      states.push(state);
      return (
        <div>
          {state.data}, {"" + state.isStale}, {"" + state.isFetching}
        </div>
      );
    }

    renderWithClient(queryClient, <Page />);

    await waitFor(() => expect(states.length).toBe(2));

    // QueryKey
    const queryKeys = queryCache.getAll().map(v => v.queryKey);
    console.log(queryKeys);
    expect(queryKeys)
      .toMatchObject([["key", {k: "v"}]]);

    // QueryHash
    const queryHash = queryCache.getAll().map(v => v.queryHash);
    console.log(queryHash);
    expect(queryHash)
      .toMatchObject(['["key",{"k":"v"}]']);

    // Cache
    expect(queryCache.find(["key", {k: "v"}])).toBeTruthy();
  });
});

