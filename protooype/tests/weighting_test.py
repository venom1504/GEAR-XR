import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('ranking',Path(__file__).resolve().parents[1]/'scripts/build_ranking.py')
ranking=importlib.util.module_from_spec(spec);spec.loader.exec_module(ranking)
def area(*pairs):return {'samples':[{'id':name,'nTPM':value} for name,value in pairs],'sampleCount':len(pairs),'matchesSavedValue':True}
class WeightingTests(unittest.TestCase):
 def test_six_tissues_outweigh_one_tissue(self):
  samples=ranking.pool_samples([area(('a',105)),area(*[(str(i),65) for i in range(6)])])
  self.assertEqual(len(samples),7);self.assertAlmostEqual(sum(samples.values())/len(samples),495/7)
 def test_duplicate_tissue_has_one_vote(self):
  self.assertEqual(ranking.pool_samples([area(('a',10)),area(('a',10),('b',20))]),{'a':10,'b':20})
 def test_conflicting_duplicate_fails_closed(self):
  with self.assertRaises(ValueError):ranking.pool_samples([area(('a',10)),area(('a',20))])
 def test_target_tissue_is_removed_from_baseline_even_if_listed_in_another_area(self):
  evidence={'measurements':{'hpa':{'G':{'target':100,'overlap':60,'other':10,'missing':999}}},'genes':{'G':{'score':1}}}
  coverage={'genes':{'G':{'studies':{'hpa':{'target':area(('a',100)),'overlap':area(('a',100),('b',20)),'other':area(('c',10))}}}}}
  result=ranking.rank_gene('G','hpa',{'target'},evidence,coverage)
  self.assertEqual(result['otherAreaMean'],15);self.assertEqual(result['comparisonSampleCount'],2)
  self.assertEqual(result['excludedBaselineAreas'],['missing']);self.assertAlmostEqual(result['enrichment'],100/15)
 def test_missing_target_does_not_fall_back_to_source_mean(self):
  evidence={'measurements':{'hpa':{'G':{'target':100,'other':10}}},'genes':{'G':{'score':1}}}
  coverage={'genes':{'G':{'studies':{'hpa':{'other':area(('c',10))}}}}}
  self.assertIsNone(ranking.rank_gene('G','hpa',{'target'},evidence,coverage))
if __name__=='__main__':unittest.main()
