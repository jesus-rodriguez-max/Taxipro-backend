"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverMembershipStatus = exports.TripStatus = void 0;
const tripStatus_1 = require("../constants/tripStatus");
Object.defineProperty(exports, "TripStatus", { enumerable: true, get: function () { return tripStatus_1.TripStatus; } });
var DriverMembershipStatus;
(function (DriverMembershipStatus) {
    DriverMembershipStatus["ACTIVE"] = "active";
    DriverMembershipStatus["GRACE_PERIOD"] = "grace_period";
    DriverMembershipStatus["SUSPENDED"] = "suspended";
    DriverMembershipStatus["UNPAID"] = "unpaid";
})(DriverMembershipStatus || (exports.DriverMembershipStatus = DriverMembershipStatus = {}));
//# sourceMappingURL=types.js.map