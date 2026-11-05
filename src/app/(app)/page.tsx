import { Screen } from "@/components/shell/screen";
import { SkeletonCartao } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <Screen titulo="Aquários">
      <div className="space-y-3">
        <SkeletonCartao />
        <SkeletonCartao />
      </div>
    </Screen>
  );
}
