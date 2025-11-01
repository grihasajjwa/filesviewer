import { FileManager } from "@/components/FileManager";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  useEffect(() => {
    // Track page visit when component mounts
    const trackVisit = async () => {
      try {
        await supabase.rpc('increment_page_visit', { page_path_param: '/' });
        console.log('Page visit tracked successfully');
      } catch (error) {
        console.error('Error tracking page visit:', error);
      }
    };
    
    trackVisit();
  }, []);

  return <FileManager />;
};

export default Index;