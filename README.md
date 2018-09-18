:warning: THIS REPO HAS MOVED TO https://github.com/appcelerator/appc-daemon-plugins

# appcd-plugin-titanium-sdk

Titanium SDK services for the Appc Daemon.

## SDKs

### Listing SDK Install Locations

Returns a list of all directories where Titanium SDKs may be installed. The first path is the
default location where new Titanium SDKs are installed to.

```js
appcd.call('/titanium-sdk/latest/sdk/list/locations', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/list/locations
{
  "status": 200,
  "message": [
    "/Users/jeff/Library/Application Support/Titanium/mobilesdk/osx",
    "/Library/Application Support/Titanium/mobilesdk/osx"
  ]
}
```

### Listing Installed Titanium SDKs

Returns a list of installed Titanium SDKs across all installation locations. This endpoint supports
subscriptions.

> :bulb: Both `/titanium-sdk/latest/sdk` and `/titanium-sdk/latest/sdk/list` forward to
> `/titanium-sdk/latest/sdk/list/installed`.

```js
appcd.call('/titanium-sdk/latest/sdk/list/installed', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/list/installed
{
  "status": 200,
  "message": [
    {
      "name": "7.0.1.GA",
      "path": "/Users/jeff/Library/Application Support/Titanium/mobilesdk/osx/7.0.1.GA",
      "manifest": {
        "name": "7.0.1.v20171218104141",
        "version": "7.0.1",
        "timestamp": "12/18/2017 18:48",
        "githash": "f5ae7e5",
        "moduleAPIVersion": {
          "iphone": "2",
          "android": "4",
          "windows": "4"
        },
        "platforms": [
          "iphone",
          "android"
        ]
      }
    },
    {
      "name": "7.1.0.GA",
      "path": "/Users/jeff/Library/Application Support/Titanium/mobilesdk/osx/7.1.0.GA",
      "manifest": {
        "name": "7.1.0.v20180314133955",
        "version": "7.1.0",
        "timestamp": "3/14/2018 20:46",
        "githash": "df92fbf",
        "moduleAPIVersion": {
          "iphone": "2",
          "android": "4",
          "windows": "4"
        },
        "platforms": [
          "iphone",
          "android"
        ]
      }
    }
  ]
}
```

To listen for changes, pass in the `--subscribe` flag:

```sh
$ appcd exec /titanium-sdk/latest/sdk/list/installed --subscribe
```

### Listing Titanium SDK GA Releases

Returns a list of all available Titanium SDK releases.

```js
appcd.call('/titanium-sdk/latest/sdk/list/releases', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/list/releases
{
  "status": 200,
  "message": {
    "7.1.0.GA": {
      "version": "7.1.0",
      "url": "http://builds.appcelerator.com/mobile-releases/7.1.0/mobilesdk-7.1.0.GA-osx.zip"
    },
    "7.0.2.GA": {
      "version": "7.0.2",
      "url": "http://builds.appcelerator.com/mobile-releases/7.0.2/mobilesdk-7.0.2.GA-osx.zip"
    },
    "7.0.1.GA": {
      "version": "7.0.1",
      "url": "http://builds.appcelerator.com/mobile-releases/7.0.1/mobilesdk-7.0.1.GA-osx.zip"
    },
    "7.0.0.GA": {
      "version": "7.0.0",
      "url": "http://builds.appcelerator.com/mobile-releases/7.0.0/mobilesdk-7.0.0.GA-osx.zip"
    },
    <snip>
  }
}
```

### Listing Continuous Integration Branches

Returns a list of CI branches and which one is the default.

```js
appcd.call('/titanium-sdk/latest/sdk/list/ci-branches', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/list/ci-branches
{
  "status": 200,
  "message": {
    "defaultBranch": "master",
    "branches": [
      "master",
      "3_5_X",
      "4_0_X",
      "4_1_X",
      "5_0_X",
      "5_1_X",
      "5_1_1",
      "5_2_X",
      "5_3_X",
      "5_4_X",
      "5_5_X",
      "6_0_X",
      "6_1_X",
      "6_2_X",
      "6_2_1",
      "6_3_X",
      "7_0_X",
      "7_1_X"
    ]
  }
}
```

### Listing Continuous Integration Builds

Returns a hash of CI builds for the `master` branch or a specific branch.

```js
appcd.call('/titanium-sdk/latest/sdk/list/ci-builds', ctx => {
	console.log(ctx.response);
});

appcd.call('/titanium-sdk/latest/sdk/list/ci-builds/master', ctx => {
	console.log(ctx.response);
});

appcd.call('/titanium-sdk/latest/sdk/list/ci-builds/7_1_X', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/list/ci-branches/7_1_X
{
  "status": 200,
  "message": {
    <snip>
    "7.1.1.v20180404110450": {
      "version": "7.1.1",
      "ts": "20180404110450",
      "githash": "32d9e223b920d6ea868bf4167493d9bd0c5fcde5",
      "date": "2018-04-04T16:04:50.000Z",
      "url": "http://builds.appcelerator.com/mobile/7_1_X/mobilesdk-7.1.1.v20180404110450-osx.zip"
    },
    "7.1.1.v20180404140210": {
      "version": "7.1.1",
      "ts": "20180404140210",
      "githash": "32d9e223b920d6ea868bf4167493d9bd0c5fcde5",
      "date": "2018-04-04T19:02:10.000Z",
      "url": "http://builds.appcelerator.com/mobile/7_1_X/mobilesdk-7.1.1.v20180404140210-osx.zip"
    }
  }
}
```

### Installing a Titanium SDK

Installing the latest GA release:

```js
appcd.call('/titanium-sdk/latest/sdk/install', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install/latest
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "latest"}'
```

Installing a specific GA release:

```sh
$ appcd exec /titanium-sdk/latest/sdk/install/7.0.2
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "7.0.2"}'
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install/7.0.2.GA
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "7.0.2.GA"}'
```


Installing an SDK from a remote URL:

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "http://builds.appcelerator.com/mobile-releases/7.1.0/mobilesdk-7.1.0.GA-osx.zip"}'
```

Installing the latest CI build for a given branch:

```sh
$ appcd exec /titanium-sdk/latest/sdk/install/master
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "master"}'
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install/7_0_X
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "7_0_X"}'
```

Installing a specific CI build by name or by branch+name:

```sh
$ appcd exec /titanium-sdk/latest/sdk/install/7.2.0.v20180403153400
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "7.2.0.v20180403153400"}'
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install/master:7.2.0.v20180403153400
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "master:7.2.0.v20180403153400"}'
```

Installing a specific CI build by git hash:

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "f9819892048c1056e4dafde22ccd1d59afae8941"}'
```

Installing from a local archive:

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "/path/to/some/titanium-dist.zip"}'
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/install '{"uri": "file:///path/to/some/titanium-dist.zip"}'
```

### Uninstalling a Titanium SDK

Uninstalls a specific Titanium SDK.

```js
appcd.call('/titanium-sdk/latest/sdk/uninstall/7.0.0.GA', ctx => {
	console.log(ctx.response);
});
```

```js
appcd.call('/titanium-sdk/latest/sdk/uninstall', { uri: '7.0.0.GA' }, ctx => {
	console.log(ctx.response);
});
```

```js
appcd.call('/titanium-sdk/latest/sdk/uninstall', { uri: '/path/to/7.0.0.GA' }, ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/uninstall/7.0.0.GA
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/uninstall '{"uri": "7.0.0.GA"}'
```

```sh
$ appcd exec /titanium-sdk/latest/sdk/uninstall '{"uri": "/path/to/7.0.0.GA"}'
```

## Modules

### Listing Module Install Locations

Returns a list of all directories where Titanium modules may be installed. The first path is the
default location.

```js
appcd.call('/titanium-sdk/latest/modules/list/locations', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/modules/list/locations
{
  "status": 200,
  "message": [
    "/Users/jeff/Library/Application Support/Titanium/modules",
    "/Library/Application Support/Titanium/modules"
  ]
}
```

### Listing Installed Titanium Modules

Returns a list of installed Titanium modules across all installation locations. This endpoint
supports subscriptions.

> :bulb: Both `/titanium-sdk/latest/modules` and `/titanium-sdk/latest/modules/list` forward to
> `/titanium-sdk/latest/modules/list/installed`.

```js
appcd.call('/titanium-sdk/latest/modules/list/installed', ctx => {
	console.log(ctx.response);
});
```

```sh
$ appcd exec /titanium-sdk/latest/modules/list/installed
{
  "status": 200,
  "message": {
    "ios": {
      "hyperloop": {
        "3.0.3": {
          "path": "/Users/jeff/Library/Application Support/Titanium/modules/windows/hyperloop/3.0.3",
          "platform": "windows",
          "version": "3.0.3",
          "apiversion": 4,
          "architectures": "ARM x86",
          "description": "hyperloop",
          "author": "Appcelerator",
          "license": "Appcelerator Commercial License",
          "copyright": "Copyright (c) 2016-Present Appcelerator, Inc.",
          "name": "hyperloop",
          "moduleid": "hyperloop",
          "moduleIdAsIdentifier": "Hyperloop",
          "classname": "HyperloopModule",
          "guid": "bdaca69f-b316-4ce6-9065-7a61e1dafa39",
          "minsdk": "7.0.0"
        }
      }
    }
  }
}
```

To listen for changes, pass in the `--subscribe` flag:

```sh
$ appcd exec /titanium-sdk/latest/module/list/installed --subscribe
```

## Legal

This project is open source under the [Apache Public License v2][1] and is developed by
[Axway, Inc](http://www.axway.com/) and the community. Please read the [`LICENSE`][1] file included
in this distribution for more information.

[1]: https://github.com/appcelerator/appcd-plugin-titanium-sdk/blob/master/LICENSE
