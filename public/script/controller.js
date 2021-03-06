// Copyright 2021 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { PhilipsHueBindings } from './services/philips_hue_bindings.js';

// Drives the entire controller, both connection management and interface management. Used for the
// actual unit interface, but not for the debug pages.
export class Controller {
    #connection;     // ControlConnection instance
    #container;      // HTMLElement for the service container
    #dialogs;        // HTMLDialogElement[] for { error, notConnected, selectRoom }
    #userInterface;  // HTMLElement[] for { configuration }

    // Name of the room this controller is responsible for.
    #room;

    // Array of element bindings that have been created for this controller.
    #bindings;

    constructor(connection, { container, dialogs, userInterface }) {
        this.#connection = connection;
        this.#container = container;
        this.#dialogs = dialogs;
        this.#userInterface = userInterface;

        // Attach connection listeners:
        connection.addEventListener('connect', Controller.prototype.onConnected.bind(this));
        connection.addEventListener('disconnect', Controller.prototype.onDisconnected.bind(this));

        // Attach event listeners to make the interface functional:
        this.initializeInterface();

        // Attempt the connection:
        connection.connect();
    }

    // ---------------------------------------------------------------------------------------------
    // Connection listeners
    // ---------------------------------------------------------------------------------------------

    // Called when the control connection has been established, either during device boot or when
    // connection was lost during operation. We assume a new environment each time this happens.
    async onConnected() {
        await this.displayConfiguration(/* manual= */ false);
    }

    onDisconnected() {
        this.toggleInterface(/* enabled= */ false);
        this.#dialogs.notConnected.showModal();
    }

    // ---------------------------------------------------------------------------------------------
    // User Interface helpers
    // ---------------------------------------------------------------------------------------------

    // Displays a dialog that allows the user to configure the device, by selecting the room the
    // panel should control and displaying any debug information sent by the server. |manual|
    // indicates whether the dialog was manually requested by the user.
    async displayConfiguration(manual) {
        const { rooms } = await this.#connection.send({ command: 'environment-rooms' });

        // (1) Close the connection dialog if it's open, as we are now connected, as well as the
        // user interface which shouldn't be visible during this operation.
        if (this.#dialogs.notConnected.open)
            this.#dialogs.notConnected.close();

        this.toggleInterface(/* enabled= */ false);

        // (2) Require the user to select a valid room which this controller is responsible for.
        if (!this.#room || !rooms.includes(this.#room) || manual)
            this.#room = await this.selectRoom(rooms);

        // (3) Fetch the list of services that exist for that room.
        const { services } = await this.#connection.send({
            command: 'environment-services',
            room: this.#room,
        });

        // (4) Clear the list of displayed services, and add each of the services to the container
        // after clearing all services that are already being displayed, if any.
        while (this.#container.firstChild)
            this.#container.removeChild(this.#container.firstChild);

        this.toggleInterface(/* enabled= */ true);

        this.#bindings = [];
        for (const service of services)
            await this.initializeService(service);
    }

    // Displays a fatal error message. The message cannot be discarded without reloading the entire
    // page & controller, and thus should only be used in exceptional circumstances.
    displayFatalError(errorMessage) {
        const message = this.#dialogs.error.querySelector('#error-message');
        const reload = this.#dialogs.error.querySelector('#error-reload-button');

        message.textContent = errorMessage;
        reload.addEventListener('click', () => document.location.reload());

        this.toggleInterface(/* enabled= */ false);
        this.#dialogs.error.show();
    }

    // Initializes the user interface elements by attaching the necessary event listeners. This will
    // be called once per page load of the controller interface.
    initializeInterface() {
        // (1) Configuration button.
        this.#userInterface.configuration.addEventListener('click', () => {
            this.displayConfiguration(/* manual= */ true);
        });
    }

    // Toggles whether the user interface should be visible or not.
    toggleInterface(enabled) {
        for (const element of Object.values(this.#userInterface))
            element.style.display = enabled ? 'block' : 'none';
    }

    // Renders the given |service| in the controller's container. The service's display will be
    // determined by a custom element specific to the given |service|.
    async initializeService({ label, service, options }) {
        let bindings = null;
        switch (service) {
            case 'Philips Hue':
                bindings = new PhilipsHueBindings(this.#connection, label, options);
                break;

            default:
                this.displayFatalError(`Cannot display unrecognised service: "${service}"`);
                return;
        }

        this.#container.appendChild(bindings.element);
        this.#bindings.push(bindings);
    }

    // Requires the user to select a room from a list of |rooms|. Will display a dialog for the
    // duration of this operation, that cannot be dismissed through other means.
    async selectRoom(rooms) {
        const roomList = this.#dialogs.selectRoom.querySelector('#room-list');
        while (roomList.firstChild)
            roomList.removeChild(roomList.firstChild);

        let roomResolver = null;
        let roomPromise = new Promise(resolve => roomResolver = resolve);

        for (const room of rooms.sort()) {
            const roomElement = document.createElement('li');

            if (room === this.#room)
                roomElement.classList.add('active');

            roomElement.textContent = room;
            roomElement.addEventListener('click', () => {
                if (!roomResolver)
                    return;

                this.#dialogs.selectRoom.close();

                roomResolver(room);
                roomResolver = null;
            });

            roomList.appendChild(roomElement);
        }

        for (const debugValue of this.#connection.debugValues) {
            const listElement = document.createElement('li');

            listElement.classList.add('debug');
            listElement.textContent = debugValue;

            roomList.appendChild(listElement);
        }

        this.#dialogs.selectRoom.show();
        return await roomPromise;
    }
}
