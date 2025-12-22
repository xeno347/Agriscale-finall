import { Lead } from '@/types/farm';
import StatusBadge from './StatusBadge';
import { Button } from '@/components/ui/button';
import { MapPin, ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LeadsTableProps {
  leads: Lead[];
  onProceed: (lead: Lead) => void;
}

const LeadsTable = ({ leads, onProceed }: LeadsTableProps) => {
  const getNextActionLabel = (status: Lead['status']) => {
    switch (status) {
      case 'contacted':
        return 'Verify';
      case 'verified':
        return 'Register';
      case 'registered':
        return 'View';
      case 'rejected':
        return 'Reopen';
      default:
        return 'Proceed';
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            <TableHead className="font-semibold">Farmer Name</TableHead>
            <TableHead className="font-semibold">Contact</TableHead>
            <TableHead className="font-semibold">Location</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead, index) => (
            <TableRow
              key={lead.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TableCell>
                <div>
                  <p className="font-medium">{lead.fullName}</p>
                  <p className="text-sm text-muted-foreground">{lead.leadSource}</p>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm">{lead.phoneNumber}</p>
                {lead.alternatePhone && (
                  <p className="text-xs text-muted-foreground">{lead.alternatePhone}</p>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{lead.village}</p>
                    <p className="text-xs text-muted-foreground">{lead.district}, {lead.state}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.status} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant={lead.status === 'rejected' ? 'outline' : 'default'}
                  onClick={() => onProceed(lead)}
                  disabled={lead.status === 'registered'}
                >
                  {getNextActionLabel(lead.status)}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadsTable;
