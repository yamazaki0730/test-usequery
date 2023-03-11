# useQuery の動作の確認

## 問題点

現在のプロジェクトで`tRPC`を使用している。
そのプロジェクトで`useQuery`を用いてキャッシュをさせたいが、`tRPC`の引数を考慮したキャッシュがされないような動作があった。

また、そのワークアラウンドのため`queryKeyHashFn`を使用して実装を行ったが、引数として与えられる型が正しくなかった。

## 動作確認方法

```
$ npm run test
```

- **react-query**の動作確認 ([.src/react.useQuery.test.tsx](`.src/react.useQuery.test.tsx`))
- **tRPC**の動作確認 ([.src/react.useQuery.test.tsx](`.src/trpc.useQuery.test.tsx`))

## 結果
### `queryKey`, `queryHash` の生成について
1. **react-query**のデフォルトの`queryHash`の計算方法は`JSON.stringify`をベースにしたものだった。
   https://github.com/TanStack/query/blob/22fbdaf6962f14e71ea1b956949bf998de02f865/packages/query-core/src/utils.ts#L265-L280

2. **tRPC**は`queryKey`を`[["key"], {input: {k: "v"}, type: "query"}]`のように生成する。
   `queryHash`の計算方法は**react-query**と同一だった。

### tRPCの`queryKeyHashFn`の引数の型が間違っている問題
TypeScript が提示する型と、実際に`queryKeyHashFn`の引数の型が一致しない。

- **tRPC**の動作確認 ([.src/react.useQuery.test.tsx](`.src/trpc.useQuery.test.tsx`))
```javascript
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
```
