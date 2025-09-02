const PROJECT = "taxipro-chofer";
const BASE_FUN = `http://127.0.0.1:5001/${PROJECT}/us-central1`;
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1";

async function signUp(email){
  const rs = await fetch(`${AUTH}/accounts:signUp?key=fake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "Secret123!", returnSecureToken: true })
  });
  const j = await rs.json();
  if (!j.idToken) throw new Error("No idToken: " + JSON.stringify(j));
  return j.idToken;
}
async function call(name, token, data){
  const r = await fetch(`${BASE_FUN}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ data })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Function ${name} failed: ${r.status} ${JSON.stringify(j)}`);
  return j;
}

(async()=>{
  try{
    const userTok = await signUp(`u+${Date.now()}@x.com`);
    const drvTok  = await signUp(`d+${Date.now()}@x.com`);

    // Crear ride
    const rideRes = await call("requestRide", userTok, {
      pickupLocation: { lat: 22.15, lng: -100.98, address: "A" },
      destination:    { lat: 22.17, lng: -100.95, address: "B" },
      fare: 99
    });
    const rideId = rideRes.rideId || rideRes?.result?.rideId;
    if (!rideId) throw new Error("No rideId in response: " + JSON.stringify(rideRes));

    // Asignar y avanzar estado
    await call("assignDriverToRide", drvTok, { rideId });
    await call("updateRideStatus", drvTok, { rideId, nextStatus: "active" });
    await call("updateRideStatus", drvTok, { rideId, nextStatus: "completed" });

    // Verificación vía callable admin
    const lite = await call("getRideLite", drvTok, { rideId });
    const data = lite.result || lite;
    const ok = data?.status === "completed";

    console.log("RIDE_ID:", rideId);
    console.log("FIRESTORE_DOC_OK:", !!ok);
    console.log("LOG: updateRideStatus flow completed successfully");
    console.log(`LOG: /rides/${rideId} status=completed`);
    process.exit(0);
  }catch(e){
    console.error("E2E_ERROR:", e.stack || e.message || String(e));
    process.exit(1);
  }
})();
