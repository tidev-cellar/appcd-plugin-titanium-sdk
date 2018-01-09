# appcd-plugin-titanium-sdk

Titanium SDK service for the Appc Daemon.

## Info

The `info` service detects globally installed Titanium SDKs and Titanium native modules.

```js
appcd.call('/titanium-sdk/latest/info', ctx => {
	console.log(ctx.response);
});
```
