// T066 / FR-042; US-5.5: carga de Inicio con el Skeleton de la geometría final (CLS = 0, maestro §15.7).
import { HomeHeader } from "@/features/home/home-header";
import { HomeSkeleton } from "@/features/home/home-skeleton";

export default function HomeLoading() {
  return (
    <>
      <HomeHeader />
      <HomeSkeleton />
    </>
  );
}
