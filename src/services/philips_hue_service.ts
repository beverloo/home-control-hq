// Copyright 2021 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Connection } from './philips_hue/connection';
import { Server } from '../server';
import { Service } from './service';

// Implements the Philips Hue service, which provides the ability to interact with Philips Hue and
// thus the ability to control lights and scenes in a house.
export class PhilipsHueService implements Service {
    private connection: Connection;
    private server: Server;

    constructor(server: Server) {
        this.connection = new Connection(server.database, server.logger);
        this.server = server;
    }

    // Returns the identifier that is unique to this service.
    getIdentifier() { return 'Philips Hue'; }

    // Initializes the Philips Hue service. This means that we ensure that a connection with the
    // Philips Hue Hub can be established, and initial light configuration can be retrieved.
    async initialize(): Promise<boolean> {
        if (!await this.connection.initialize())
            return false;

        return true;
    }

    // Validates whether the given |options| are valid for use with the Philips Hue service.
    async validate(options: object): Promise<boolean> {
        return true;
    }
}
