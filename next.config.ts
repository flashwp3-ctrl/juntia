import type { NextConfig } from "next";
// Conserva el contrato del repositorio: next dev no reescribe AGENTS.md.
const nextConfig: NextConfig = { agentRules: false };
export default nextConfig;
