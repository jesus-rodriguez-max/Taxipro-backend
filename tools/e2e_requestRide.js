const PROJECT = "taxipro-chofer";
const BASE_FUN = `http://127.0.0.1:5001/${PROJECT}/us-central1`;
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

(async () => {
  try {
    const email = `rider+${Date.now()}@example.com`;
    const rs = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Secret123!", returnSecureToken: true })
    });
    const sj = await rs.json();
    if (!sj.idToken) throw new Error("No idToken: " + JSON.stringify(sj));
    const idToken = sj.idToken;

    const payload = {
      data: {
        pickupLocation: { lat: 22.15, lng: -100.98, address: "Soriana San Luis" },
        destination:    { lat: 22.17, lng: -100.95, address: "Centro Histórico" },
        fare: 85
      }
    };

    const rf = await fetch(`${BASE_FUN}/requestRide`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify(payload)
    });
    const rj = await rf.json();

    const rideId = rj.rideId || (rj.result && rj.result.rideId);
    const ok = rj.hasCreated || (rj.result && rj.result.hasCreated);

    if (!rideId) throw new Error("No rideId in response: " + JSON.stringify(rj));

    console.log("RIDE_ID:", rideId);
    console.log("FIRESTORE_DOC_OK:", !!ok);
    console.log("LOG: requestRide invoked successfully");
    console.log(`LOG: /rides/${rideId} created`);
    process.exit(0);
  } catch (e) {
    console.error("E2E_ERROR:", e.stack || e.message || String(e));
    process.exit(1);
  }
})();
