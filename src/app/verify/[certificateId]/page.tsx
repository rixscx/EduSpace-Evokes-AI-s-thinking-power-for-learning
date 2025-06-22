import { getCertificateRecordById } from "@/lib/mockCourses";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, GraduationCap, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default async function VerifyCertificatePage({ params }: { params: { certificateId: string } }) {
  const certificateId = params.certificateId;
  const certificate = await getCertificateRecordById(certificateId);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4 sm:p-6 lg:p-8">
      <main className="w-full max-w-2xl animate-fade-in">
        <Card className="shadow-xl border-border/60 rounded-xl overflow-hidden bg-card">
          <CardHeader className="p-6 md:p-8 text-center bg-muted/50 border-b border-border/60">
            <GraduationCap className="mx-auto h-16 w-16 text-primary drop-shadow-lg mb-2" />
            <CardTitle className="text-2xl font-bold tracking-tight text-primary">Certificate Verification</CardTitle>
            <CardDescription className="text-foreground/80">EduSpace Official Credential</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 text-center">
            {certificate && certificate.status === 'approved' ? (
              <div className="space-y-4">
                <BadgeCheck className="mx-auto h-20 w-20 text-green-500" />
                <h2 className="text-xl font-semibold text-green-600">Certificate Verified</h2>
                <p className="text-foreground/90">This is to certify that</p>
                <p className="text-3xl font-bold text-foreground tracking-tight">{certificate.studentName}</p>
                <p className="text-foreground/90">has successfully completed the course</p>
                <p className="text-2xl font-semibold text-primary">{certificate.courseTitle}</p>
                <p className="text-muted-foreground text-sm">
                  Issued on: {format(new Date(certificate.issuedDate), "MMMM d, yyyy")}
                </p>
                <Badge variant="secondary" className="text-xs">Certificate ID: {certificate.id}</Badge>
              </div>
            ) : certificate ? (
              <div className="space-y-4">
                <XCircle className="mx-auto h-20 w-20 text-orange-500" />
                <h2 className="text-xl font-semibold text-orange-600">Verification Pending</h2>
                <p className="text-foreground/90">
                  A certificate with this ID exists but has not yet been approved by an instructor.
                </p>
                <p className="text-muted-foreground text-sm">
                  Please check back later or contact the course instructor for more information.
                </p>
                <Badge variant="outline" className="text-xs">Certificate ID: {certificateId}</Badge>
              </div>
            ) : (
              <div className="space-y-4">
                <XCircle className="mx-auto h-20 w-20 text-destructive" />
                <h2 className="text-xl font-semibold text-destructive">Certificate Not Found</h2>
                <p className="text-foreground/90">
                  No valid certificate was found with the provided ID.
                </p>
                <p className="text-muted-foreground text-sm">
                  Please check the ID and try again, or ensure the link you are using is correct.
                </p>
                <Badge variant="destructive" className="text-xs">Invalid ID: {certificateId}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
