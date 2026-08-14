const fs = require('fs');
let code = fs.readFileSync('gfg-main/src/pages/Inbox.tsx', 'utf8');

if (!code.includes('sentimentSummary')) {
  code = code.replace(
    "const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);",
    "const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);\n  const [sentimentSummary, setSentimentSummary] = useState<string>('');\n  const [loadingSentiment, setLoadingSentiment] = useState<boolean>(false);"
  );
  
  const sentimentFetchCode = `  const loadInbox = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getInboxMessages(100);
      setMessages(data);
      if (data.length > 0 && !selectedMsg) {
        setSelectedMsg(data[0]);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load inbox', description: err.message });
    } finally {
      setLoading(false);
    }
    
    // Load sentiment
    setLoadingSentiment(true);
    try {
      const sentData = await api.getInboxSentiment();
      if (sentData && sentData.summary) {
        setSentimentSummary(sentData.summary);
      }
    } catch (err) {
      console.log('Could not load sentiment', err);
    } finally {
      setLoadingSentiment(false);
    }
  }, [selectedMsg]);`;

  code = code.replace(/  const loadInbox = React\.useCallback\(async \(\) => \{[\s\S]*?\}, \[selectedMsg\]\);/, sentimentFetchCode);
  
  // Insert UI in the left panel (above the search bar)
  const sentimentUI = `
          {/* AI Sentiment Summary Panel */}
          <div className="mx-4 mt-4 p-4 bg-muted/30 border border-primary/20 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
            <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="h-4 w-4" /> AI Sentiment Analysis
            </div>
            {loadingSentiment ? (
              <div className="animate-pulse flex flex-col gap-2">
                <div className="h-3 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {sentimentSummary || "No recent replies to analyze."}
              </p>
            )}
          </div>
  `;
  
  code = code.replace(
    '<div className="p-4 border-b border-border space-y-3 shrink-0">',
    sentimentUI + '\n          <div className="p-4 border-b border-border space-y-3 shrink-0">'
  );
  
  fs.writeFileSync('gfg-main/src/pages/Inbox.tsx', code);
  console.log('patched Inbox.tsx');
}
