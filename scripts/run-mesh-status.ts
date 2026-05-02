// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // MUST be first: loads .env before any singleton reads process.env

import { mesh } from "../core/neuromesh/mesh";

console.log(JSON.stringify(mesh.getHealthReport(), null, 2));
