import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Eye, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const History = () => {
    const [history, setHistory] = useState<any[]>([]);
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const savedHistory = JSON.parse(localStorage.getItem('quotation_history') || '[]');
        setHistory(savedHistory);
    }, []);

    const deleteEntry = (id: string) => {
        const updatedHistory = history.filter(item => item.id !== id);
        localStorage.setItem('quotation_history', JSON.stringify(updatedHistory));
        setHistory(updatedHistory);
        toast({
            title: "Entry Deleted",
            description: "The quotation has been removed from history.",
        });
    };

    const loadEntry = (id: string) => {
        navigate(`/?id=${id}`);
    };

    return (
        <div className="min-h-screen bg-quotation-bg p-4 flex flex-col items-center">
            <div className="max-w-7xl w-full space-y-6">
                <div className="flex items-center justify-between">
                    <Link to="/">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Generator
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800">Quotation History</h1>
                    <div className="w-24"></div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Saved Quotations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {history.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                No saved quotations yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Quotation #</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Total Amount</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">
                                                    {new Date(item.timestamp).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>{item.quotationNumber}</TableCell>
                                                <TableCell>{item.customerDetails.name || 'N/A'}</TableCell>
                                                <TableCell>{item.totalAmount.toFixed(0)} USD</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-500 border-blue-200"
                                                        onClick={() => loadEntry(item.id)}
                                                        title="View/Edit"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 border-red-200"
                                                        onClick={() => deleteEntry(item.id)}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default History;
