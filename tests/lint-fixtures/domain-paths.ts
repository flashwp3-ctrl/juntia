import { Button } from "../components/ui/button";
import RootLayout from "@/app/layout";
import { copy } from "@/lib/copy/es";
import guide from "./README.md";
import aliasGuide from "@/domain/README.md";
import { readFile } from "node:fs/promises";
import styles from "@/styles/tokens.css";
import escapedGuide from "@/domain/../lib/copy/es";
export { Button, RootLayout, copy, guide, aliasGuide, readFile, styles, escapedGuide };
