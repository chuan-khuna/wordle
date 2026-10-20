use super::*;

#[test]
fn matches_python_random() {
    // python -c "import random; r = random.Random(7); print([r.getrandbits(32) for _ in range(3)])"
    let mut mt = MersenneTwister::from_seed(7);
    assert_eq!([mt.next_u32(), mt.next_u32(), mt.next_u32()], PYTHON_SEED_7);
}

const PYTHON_SEED_7: [u32; 3] = [1_390_851_128, 4_071_050_724, 647_892_279];
