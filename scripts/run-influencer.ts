// Created by BBMW0 Technologies | bbmw0.com
import "../api/env"; // MUST be first: loads .env before any singleton reads process.env

import { bbm0902Engine } from "../intelligence/content/bbm0902-influencer-engine";

bbm0902Engine.generateInfluencerShort()
  .then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(console.error);
