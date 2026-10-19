//! Pick an Answer from a Seed exactly as Python's `random.Random(seed).choice(...)` does,
//! so `--seed 7` gives the same Answer in the terminal game and in this app.
//!
//! Python's `random` is the Mersenne Twister (MT19937), seeded with `init_by_array`
//! from the Seed's 32-bit chunks. `choice` draws `n.bit_length()` bits at a time
//! and throws away draws that are `>= n`.

const N: usize = 624;
const M: usize = 397;

struct MersenneTwister {
    state: [u32; N],
    index: usize,
}

impl MersenneTwister {
    /// `random.Random(seed)` for a Seed below 2^32.
    fn from_seed(seed: u32) -> Self {
        let mut mt = Self::init_genrand(19_650_218);
        let key = [seed];
        let (mut i, mut j) = (1, 0);
        for _ in 0..N.max(key.len()) {
            let prev = mt.state[i - 1] ^ (mt.state[i - 1] >> 30);
            mt.state[i] = (mt.state[i] ^ prev.wrapping_mul(1_664_525))
                .wrapping_add(key[j])
                .wrapping_add(j as u32);
            i += 1;
            j += 1;
            if i >= N {
                mt.state[0] = mt.state[N - 1];
                i = 1;
            }
            if j >= key.len() {
                j = 0;
            }
        }
        for _ in 0..N - 1 {
            let prev = mt.state[i - 1] ^ (mt.state[i - 1] >> 30);
            mt.state[i] = (mt.state[i] ^ prev.wrapping_mul(1_566_083_941)).wrapping_sub(i as u32);
            i += 1;
            if i >= N {
                mt.state[0] = mt.state[N - 1];
                i = 1;
            }
        }
        mt.state[0] = 0x8000_0000;
        mt
    }

    fn init_genrand(s: u32) -> Self {
        let mut state = [0u32; N];
        state[0] = s;
        for i in 1..N {
            state[i] = 1_812_433_253u32
                .wrapping_mul(state[i - 1] ^ (state[i - 1] >> 30))
                .wrapping_add(i as u32);
        }
        Self { state, index: N }
    }

    fn next_u32(&mut self) -> u32 {
        if self.index >= N {
            for k in 0..N {
                let y = (self.state[k] & 0x8000_0000) | (self.state[(k + 1) % N] & 0x7fff_ffff);
                let mag = if y & 1 == 1 { 0x9908_b0df } else { 0 };
                self.state[k] = self.state[(k + M) % N] ^ (y >> 1) ^ mag;
            }
            self.index = 0;
        }
        let mut y = self.state[self.index];
        self.index += 1;
        y ^= y >> 11;
        y ^= (y << 7) & 0x9d2c_5680;
        y ^= (y << 15) & 0xefc6_0000;
        y ^ (y >> 18)
    }

    /// Python's `_randbelow(n)`: a uniform number from 0 to n - 1.
    fn below(&mut self, n: usize) -> usize {
        let bits = usize::BITS - n.leading_zeros(); // n.bit_length()
        loop {
            let r = (self.next_u32() >> (32 - bits)) as usize;
            if r < n {
                return r;
            }
        }
    }
}

/// The index `random.Random(seed).choice(seq)` would pick from a sequence of `len` items.
pub fn choose_index(seed: u32, len: usize) -> usize {
    MersenneTwister::from_seed(seed).below(len)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_python_random() {
        // python -c "import random; r = random.Random(7); print([r.getrandbits(32) for _ in range(3)])"
        let mut mt = MersenneTwister::from_seed(7);
        assert_eq!([mt.next_u32(), mt.next_u32(), mt.next_u32()], PYTHON_SEED_7);
    }

    const PYTHON_SEED_7: [u32; 3] = [1_390_851_128, 4_071_050_724, 647_892_279];
}
