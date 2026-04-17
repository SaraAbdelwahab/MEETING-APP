import React, { useState, useEffect, useRef } from 'react';
import { MdPlayCircle, MdCheckCircle, MdWarning, MdFileDownload, MdVerified } from 'react-icons/md';
import { FiHash, FiGitMerge, FiFileText, FiShield } from 'react-icons/fi';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';
import StatusIndicator from '../ui/StatusIndicator';
import toast from 'react-hot-toast';
import IntegrityVerifier from '../security/IntegrityVerifier';
import { getUserRecordings, exportRecording } from '../../api/recordings';

const IntegrityRow = ({ icon: Icon, label, detail, status, onVerify }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                {detail && <p className="text-xs text-gray-400 truncate">{detail}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {onVerify && (
                <button onClick={onVerify} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                    Verify
                </button>
            )}
            <StatusIndicator status={status} size="sm" />
        </div>
    </div>
);

const RecordingIntegrityCard = () => {
    const [recordings, setRecordings] = useState([]);
    const [selectedRecording, setSelectedRecording] = useState(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [lastVerified, setLastVerified] = useState(null);
    const [exporting, setExporting] = useState(false);
    const integrityVerifierRef = useRef(null);

    // Fetch user recordings on mount
    useEffect(() => {
        const fetchRecordings = async () => {
            try {
                setLoading(true);
                const data = await getUserRecordings();
                setRecordings(data || []);
                if (data && data.length > 0) {
                    setSelectedRecording(data[0]);
                }
            } catch (error) {
                console.error('Failed to fetch recordings:', error);
                toast.error('Failed to load recordings');
            } finally {
                setLoading(false);
            }
        };

        fetchRecordings();
    }, []);

    const handleVerify = async () => {
        if (!selectedRecording) {
            toast.error('No recording selected');
            return;
        }

        setVerifying(true);
        try {
            // Use IntegrityVerifier to start verification
            if (integrityVerifierRef.current) {
                await integrityVerifierRef.current.startVerification(selectedRecording.recordingId);
                setLastVerified(new Date());
                toast.success('Recording integrity verified — no tampering detected');
            }
        } catch (error) {
            console.error('Verification failed:', error);
            toast.error('Verification failed: ' + (error.message || 'Unknown error'));
        } finally {
            setVerifying(false);
        }
    };

    const handleExport = async () => {
        if (!selectedRecording) {
            toast.error('No recording selected');
            return;
        }

        setExporting(true);
        try {
            const blob = await exportRecording(selectedRecording.recordingId);
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `recording-${selectedRecording.recordingId}.c2pa.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success('Recording exported with C2PA manifest');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export failed: ' + (error.message || 'Unknown error'));
        } finally {
            setExporting(false);
        }
    };

    const getVerificationStatus = () => {
        if (!integrityVerifierRef.current) return 'idle';
        return integrityVerifierRef.current.verificationState || 'idle';
    };

    const getStatusForRow = () => {
        const state = getVerificationStatus();
        if (state === 'passed') return 'verified';
        if (state === 'tampered') return 'error';
        if (state === 'verifying') return 'warning';
        return 'idle';
    };

    const timeAgo = lastVerified 
        ? Math.round((Date.now() - lastVerified.getTime()) / 60000)
        : null;

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                            <MdPlayCircle size={22} className="text-teal-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Recording Integrity</p>
                            <p className="text-xs text-gray-400">Loading...</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    if (recordings.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                            <MdPlayCircle size={22} className="text-teal-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Recording Integrity</p>
                            <p className="text-xs text-gray-400">No recordings available</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    const verificationState = getVerificationStatus();
    const badgeVariant = verificationState === 'passed' ? 'success' : 
                         verificationState === 'tampered' ? 'error' : 'default';
    const badgeText = verificationState === 'passed' ? 'Protected' :
                      verificationState === 'tampered' ? 'Tampered' : 'Unverified';

    return (
        <Card>
            <IntegrityVerifier
                ref={integrityVerifierRef}
                recordingId={selectedRecording?.recordingId}
                merkleRoot={selectedRecording?.merkleRoot}
                onTamperDetected={(details) => {
                    toast.error(`Tamper detected in chunk ${details.chunkIndex}`);
                }}
            />
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
                            <MdPlayCircle size={22} className="text-teal-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Recording Integrity</p>
                            <p className="text-xs text-gray-400">
                                {timeAgo !== null ? `Verified ${timeAgo}m ago` : 'Not yet verified'}
                            </p>
                        </div>
                    </div>
                    <Badge variant={badgeVariant} dot>{badgeText}</Badge>
                </div>
            </CardHeader>
            <CardBody>
                <IntegrityRow
                    icon={FiHash}
                    label="Chunk Hashing"
                    detail="SHA-256 per 10s segment"
                    status={getStatusForRow()}
                />
                <IntegrityRow
                    icon={FiGitMerge}
                    label="Merkle Tree"
                    detail="Append-only root stored"
                    status={getStatusForRow()}
                />
                <IntegrityRow
                    icon={FiFileText}
                    label="C2PA Manifest"
                    detail="Signed with platform key"
                    status={getStatusForRow()}
                />
                <IntegrityRow
                    icon={FiShield}
                    label="Tamper Detection"
                    detail="Real-time playback check"
                    status={getStatusForRow()}
                    onVerify={handleVerify}
                />

                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleVerify}
                        disabled={verifying || !selectedRecording}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <MdVerified size={16} className={verifying ? 'animate-spin text-blue-500' : 'text-teal-500'} />
                        {verifying ? 'Verifying…' : 'Verify All'}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting || !selectedRecording}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                    >
                        <MdFileDownload size={16} className={exporting ? 'animate-spin' : ''} />
                        {exporting ? 'Exporting…' : 'Export'}
                    </button>
                </div>
            </CardBody>
        </Card>
    );
};

export default RecordingIntegrityCard;
