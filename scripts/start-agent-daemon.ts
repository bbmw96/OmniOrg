#!/usr/bin/env ts-node
// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // ← MUST be first: loads .env before any singleton reads process.env

import { agentDaemon } from "../intelligence/core/agent-scheduler-daemon";

const args = process.argv.slice(2);

if (args[0] === "install") {
  agentDaemon.installAsWindowsService();
} else if (args[0] === "uninstall") {
  agentDaemon.uninstallWindowsService();
} else {
  agentDaemon.start();
}
