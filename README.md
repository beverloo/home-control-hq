# Home Control HQ
Node-based server powering my smart home controllers and services. **This is rather unlikely to be of any use to you.**

The [server](src/), written in TypeScript, serves the [frontend](public/) over HTTP to a number of
controller devices across our house, and maintains the ability to interact with a series of smart
home services such as Philips Hue and Tado.

A WebSocket connection is then used to establish a long-lived bidirectional communication channel
between the controllers and the server, either to communicate commands ("turn the lights on") or to
communicate state updates ("something else changed the lights").

The server runs on a Raspberry Pi 4, whereas the controllers are physical 1024x768 displays mounted
on the wall. They run [WebLayer](https://source.chromium.org/chromium/chromium/src/+/master:weblayer/?ss=chromium)
based on Chromium 90. Each display controls a single room.

# Supported services

## Philips Hue
Controlling Philips Hue is enabled by the [node-hue-api](https://www.npmjs.com/package/node-hue-api)
library. Each service entry controls either a named group or room.

```json5
{
    "label": "Lights",
    "service": "Philips Hue",
    "options": {
        // Indicates the named room or zone to control. Lights and scenes that are part of this
        // group are discovered and updated automatically.
        "group": "Room name",
    }
}
```

The following commands are supported by the Philips Hue service:

  * **philips-hue-brightness** (`group`, `brightness`): Change the brightness of a light group.
  * **philips-hue-colour** (`group`, `colour`): Change the colour of a light group (RRGGBB).
  * **philips-hue-power** (`group`, `on`): Toggle power to the lights in a Philips Hue light group.
  * **philips-hue-scene** (`group`, `scene`): Change the scene applied to a Philips Hue light group.
  * **philips-hue-state** (`group`): Retrieve the full state of a Philips Hue light group.

## Miscellaneous commands
There are a number of supported commands that exist purely to introspect or instruct the server
infrastructure.

  * **environment-rooms** (_no paramters_): Retrieves the list of defined rooms.
  * **environment-services** (`room`): Retrieves the list of defined services for a room.
  * **hello** (_no parameters_): Client hello.
  * **reload-environment** (_no parameters_): Reloads the server's environment configuration.
  * **service-commands** (`service`): Retrieves the list of defined commands for a service.

# Installation, configuration and use

## Installation
```bash
git clone https://github.com/beverloo/home-control-hq.git && cd home-control-hq
npm install
```

## Configuration (`home-configuration.json`)
```json5
{
    "Room name": [
        // Service entries go here.
    ]
}
```

## Running the server
```bash
npm run-script serve
```
