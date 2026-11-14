import { ButtonLink, PageHeader, container } from "@/components/ui";

export default function NotFound() {
  return (
    <div className={`${container} py-16`}>
      <PageHeader eyebrow="Page not found" title="We couldn't find that page." intro="Tell us what you need and we'll point you the right way." />
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/find-help">Find Help</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to Home
        </ButtonLink>
      </div>
    </div>
  );
}
