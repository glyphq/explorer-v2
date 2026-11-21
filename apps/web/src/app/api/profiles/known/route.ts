import { listKnownProfiles, noStoreHeaders, profileErrorResponse } from "@/lib/profiles/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profiles = await listKnownProfiles();
    return Response.json({ profiles }, { headers: noStoreHeaders() });
  } catch (error) {
    return profileErrorResponse(error, noStoreHeaders());
  }
}
